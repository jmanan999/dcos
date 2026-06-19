"""
AI enrichment service — the differentiator.

Classifies, scores, deduplicates and embeds every grievance using Gemini.
Called by the async outbox worker (not inline with intake).

Pipeline per grievance:
  1. Detect language
  2. Classify → category + department + subcategory (structured JSON output)
  3. Severity score 1-100
  4. Spam / bot detection
  5. Generate 768-dim embedding (text-embedding-004)
  6. Duplicate / cluster detection via pgvector cosine similarity
  7. Write results back to grievance row + ai_results table
  8. Emit grievance.enriched outbox event → routing worker
"""
from __future__ import annotations

import json
import time
import uuid
from typing import Any

import structlog
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.modules.ai.models import AIResult, FeedbackLabel
from app.modules.ai.schemas import (
    AIEnrichmentResult,
    ClassificationResult,
    ClusterMatch,
    FeedbackLabelCreate,
    SeverityScore,
    SpamScore,
)
from app.modules.intake.models import Grievance, GrievanceCluster
from app.modules.platform.repository import AuditRepository, OutboxRepository

log = structlog.get_logger()

# ── Category → department mapping ────────────────────────────────────────────
# Used as fallback when AI classification is uncertain
CATEGORY_DEPT_MAP: dict[str, str] = {
    "Pothole / Road Damage": "MCD",
    "Garbage Not Collected": "MCD",
    "Stray Animal Menace": "MCD",
    "Illegal Construction": "MCD",
    "Waterlogging / Flooding": "MCD",
    "Park Not Maintained": "MCD",
    "No Water Supply": "DJB",
    "Low Water Pressure": "DJB",
    "Sewage Overflow": "DJB",
    "Pipe Leakage / Burst": "DJB",
    "Road Repair Required": "PWD",
    "Flyover / Bridge Damage": "PWD",
    "Streetlight Not Working": "PWD",
    "Vehicle Theft": "DP",
    "Noise Pollution": "DP",
    "Traffic Signal Fault": "DP",
    "Bus Not Available on Route": "DTC",
    "Bus Delay": "DTC",
    "Power Outage": "BSES-R",
    "Low Voltage": "BSES-R",
    "Industrial Air Pollution": "DPCC",
    "Construction Dust": "DPCC",
    "Metro Safety Concern": "DMRC",
    "Medicine Not Available": "HEALTH",
    "Doctor Absent": "HEALTH",
}

# ── Severity rubric ───────────────────────────────────────────────────────────
_SEVERITY_PROMPT = """
Rate the severity of this civic complaint on a scale of 1-100.
Consider:
- Life safety risk (pothole causing accidents = higher)
- Number of people affected
- Duration (days since reported)
- Location importance (market area vs residential)
- Emergency signals (injury, child, hospital, school nearby)

Return JSON: {"score": <1-100>, "factors": ["...", "..."], "priority": "CRITICAL|HIGH|MEDIUM|LOW"}
"""

_CLASSIFY_PROMPT = """
You are a Delhi civic grievance classifier. Classify this complaint:

Text: {text}
Language hint: {language}

Available departments: MCD, DJB, PWD, DP (Delhi Police), DTC, BSES-R, BSES-Y, TPDDL, DPCC, NDMC, DMRC, HEALTH

Return JSON:
{{
  "category": "<specific category>",
  "subcategory": "<optional subcategory or null>",
  "department_code": "<best department code>",
  "confidence": <0.0-1.0>,
  "language": "<detected ISO 639-1 language code>",
  "translated_text": "<English translation if not English, else null>"
}}

Only return valid JSON, no explanation.
"""

_SPAM_PROMPT = """
Assess if this text is a spam/bot/political misuse complaint.
Text: {text}
Return JSON: {{"score": <0.0-1.0>, "is_spam": <true/false>, "reason": "<brief or null>"}}
Only return valid JSON.
"""


class AIService:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session
        self._outbox = OutboxRepository(session)
        self._audit = AuditRepository(session)

    # ── Main enrichment entry point ───────────────────────────────────────────

    async def enrich(self, grievance_id: uuid.UUID) -> AIEnrichmentResult | None:
        grievance = await self._s.get(Grievance, grievance_id)
        if not grievance:
            log.warning("ai.enrich.not_found", grievance_id=str(grievance_id))
            return None

        if not settings.GEMINI_API_KEY:
            log.info("ai.enrich.skipped", reason="no GEMINI_API_KEY")
            return await self._enrich_mock(grievance)

        t0 = time.perf_counter()
        try:
            classification = await self._classify(grievance.raw_text, grievance.language)
            severity = await self._score_severity(grievance.raw_text)
            spam = await self._score_spam(grievance.raw_text)
            embedding = await self._embed(grievance.raw_text)
        except Exception as exc:
            log.error("ai.enrich.failed", grievance_id=str(grievance_id), error=str(exc))
            # Low-confidence fallback → human review queue
            classification = ClassificationResult(
                category="Unknown",
                department_code="MCD",
                confidence=0.0,
            )
            severity = SeverityScore(score=30, factors=["unknown"], priority="MEDIUM")
            spam = SpamScore(score=0.0, is_spam=False)
            embedding = None

        latency_ms = int((time.perf_counter() - t0) * 1000)

        # Cluster / dedup
        cluster = await self._detect_cluster(grievance, classification, embedding)

        # Lookup department_id from short_code
        dept_id = await self._dept_id_from_code(classification.department_code)

        # Update grievance row
        await self._s.execute(
            text("""
                UPDATE grievances SET
                  category = :cat,
                  subcategory = :subcat,
                  department_id = :dept_id,
                  severity = :severity,
                  ai_confidence = :confidence,
                  spam_score = :spam_score,
                  status = CASE
                    WHEN :confidence < 0.5 THEN 'RECEIVED'
                    WHEN :spam > 0.7 THEN 'REJECTED_SPAM'
                    ELSE 'CLASSIFIED'
                  END,
                  cluster_id = :cluster_id,
                  language = :language,
                  updated_at = now()
                WHERE id = :id
            """),
            {
                "cat": classification.category,
                "subcat": classification.subcategory,
                "dept_id": str(dept_id) if dept_id else None,
                "severity": severity.score,
                "confidence": classification.confidence,
                "spam_score": spam.score,
                "spam": spam.score,
                "cluster_id": str(cluster.cluster_id) if cluster.cluster_id else None,
                "language": classification.language,
                "id": str(grievance_id),
            },
        )

        # Store embedding if we have it
        if embedding:
            # CAST(x AS vector) — ::vector syntax confuses SQLAlchemy's :param parser
            await self._s.execute(
                text("UPDATE grievances SET embedding = CAST(:emb AS vector) WHERE id = :id"),
                {"emb": json.dumps(embedding), "id": str(grievance_id)},
            )

        # Persist AI result for audit / retraining
        self._s.add(AIResult(
            grievance_id=grievance_id,
            model_version=settings.GEMINI_MODEL_DEFAULT,
            raw_response={"classification": classification.model_dump(), "severity": severity.model_dump()},
            category=classification.category,
            subcategory=classification.subcategory,
            department_code=classification.department_code,
            confidence=classification.confidence,
            severity_score=severity.score,
            spam_score=spam.score,
            language=classification.language,
            latency_ms=latency_ms,
        ))

        # Emit enriched event → routing worker
        await self._outbox.emit(
            event_type="grievance.enriched",
            aggregate_type="grievance",
            aggregate_id=str(grievance_id),
            payload={
                "grievance_id": str(grievance_id),
                "category": classification.category,
                "department_code": classification.department_code,
                "severity": severity.score,
                "confidence": classification.confidence,
                "is_spam": spam.is_spam,
                "cluster_id": str(cluster.cluster_id) if cluster.cluster_id else None,
            },
        )

        log.info(
            "ai.enriched",
            grievance_id=str(grievance_id),
            category=classification.category,
            dept=classification.department_code,
            severity=severity.score,
            confidence=classification.confidence,
            latency_ms=latency_ms,
        )

        return AIEnrichmentResult(
            grievance_id=grievance_id,
            classification=classification,
            severity=severity,
            spam=spam,
            cluster=cluster,
            embedding_stored=embedding is not None,
        )

    # ── Gemini calls ──────────────────────────────────────────────────────────

    async def _classify(self, text: str, language: str) -> ClassificationResult:
        raw = await self._gemini_json(
            _CLASSIFY_PROMPT.format(text=text[:2000], language=language)
        )
        return ClassificationResult(
            category=raw.get("category", "General"),
            subcategory=raw.get("subcategory"),
            department_code=raw.get("department_code", "MCD"),
            confidence=float(raw.get("confidence", 0.5)),
            language=raw.get("language", language),
            translated_text=raw.get("translated_text"),
        )

    async def _score_severity(self, text: str) -> SeverityScore:
        raw = await self._gemini_json(f"{_SEVERITY_PROMPT}\nComplaint: {text[:1000]}")
        score = max(1, min(100, int(raw.get("score", 40))))
        priority = raw.get("priority", "MEDIUM")
        if priority not in ("CRITICAL", "HIGH", "MEDIUM", "LOW"):
            priority = "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW"
        return SeverityScore(score=score, factors=raw.get("factors", []), priority=priority)

    async def _score_spam(self, text: str) -> SpamScore:
        raw = await self._gemini_json(_SPAM_PROMPT.format(text=text[:500]))
        score = float(raw.get("score", 0.05))
        return SpamScore(score=score, is_spam=raw.get("is_spam", False), reason=raw.get("reason"))

    async def _embed(self, text: str) -> list[float] | None:
        """Generate 768-dim embedding via Gemini text-embedding-004."""
        try:
            import asyncio

            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)

            def _call() -> list[float]:
                result = genai.embed_content(
                    model="models/text-embedding-004",
                    content=text[:2000],
                    task_type="RETRIEVAL_DOCUMENT",
                )
                return result["embedding"]

            return await asyncio.get_event_loop().run_in_executor(None, _call)
        except Exception as exc:
            log.warning("ai.embed.failed", error=str(exc))
            return None

    async def _gemini_json(self, prompt: str) -> dict[str, Any]:
        import asyncio

        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel(settings.GEMINI_MODEL_DEFAULT)

        def _call() -> str:
            resp = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"},
            )
            return resp.text

        raw = await asyncio.get_event_loop().run_in_executor(None, _call)
        return json.loads(raw)

    # ── Cluster / dedup ───────────────────────────────────────────────────────

    async def _detect_cluster(
        self,
        grievance: Grievance,
        classification: ClassificationResult,
        embedding: list[float] | None,
    ) -> ClusterMatch:
        similar: list[uuid.UUID] = []

        if embedding and classification.confidence >= 0.5:
            # pgvector cosine similarity — CTE to cast once, avoid ::vector parse issue
            rows = await self._s.execute(
                text("""
                    WITH qvec AS (SELECT CAST(:emb AS vector) AS v)
                    SELECT g.id
                    FROM grievances g, qvec
                    WHERE g.id != :gid
                      AND g.category = :cat
                      AND g.embedding IS NOT NULL
                      AND 1 - (g.embedding <=> qvec.v) > 0.85
                    ORDER BY g.embedding <=> qvec.v
                    LIMIT 5
                """),
                {
                    "emb": json.dumps(embedding),
                    "gid": str(grievance.id),
                    "cat": classification.category,
                },
            )
            similar = [uuid.UUID(str(r[0])) for r in rows.fetchall()]

        if similar:
            # Find or create cluster
            existing_cluster = await self._s.execute(
                select(GrievanceCluster).where(
                    GrievanceCluster.master_grievance_id == similar[0],
                    GrievanceCluster.is_active.is_(True),
                ).limit(1)
            )
            cluster = existing_cluster.scalar_one_or_none()
            if cluster:
                await self._s.execute(
                    text("UPDATE grievance_clusters SET count = count + 1, updated_at = now() WHERE id = :id"),
                    {"id": str(cluster.id)},
                )
                return ClusterMatch(
                    cluster_id=cluster.id,
                    is_new_cluster=False,
                    similar_grievance_ids=similar,
                    similarity_score=0.9,
                )
            else:
                new_cluster = GrievanceCluster(
                    category=classification.category,
                    subcategory=classification.subcategory,
                    master_grievance_id=similar[0],
                    count=2,
                    centroid_lat=grievance.latitude,
                    centroid_lng=grievance.longitude,
                )
                self._s.add(new_cluster)
                await self._s.flush()
                return ClusterMatch(
                    cluster_id=new_cluster.id,
                    is_new_cluster=True,
                    similar_grievance_ids=similar,
                    similarity_score=0.9,
                )

        return ClusterMatch(cluster_id=None, is_new_cluster=False, similar_grievance_ids=[], similarity_score=0.0)

    # ── Feedback loop ─────────────────────────────────────────────────────────

    async def record_correction(self, body: FeedbackLabelCreate, officer_id: str) -> FeedbackLabel:
        """Officer corrections stored as labeled data for model evaluation."""
        grievance = await self._s.get(Grievance, body.grievance_id)
        label = FeedbackLabel(
            grievance_id=body.grievance_id,
            officer_id=officer_id,
            original_category=grievance.category if grievance else None,
            corrected_category=body.corrected_category,
            original_department_code=None,
            corrected_department_code=body.corrected_department_code,
            correction_note=body.correction_note,
        )
        self._s.add(label)
        await self._s.flush()
        log.info("ai.feedback.recorded", grievance_id=str(body.grievance_id), officer=officer_id)
        return label

    # ── Mock mode (no API key) ────────────────────────────────────────────────

    async def _enrich_mock(self, grievance: Grievance) -> AIEnrichmentResult:
        """Deterministic mock classification when GEMINI_API_KEY is absent."""
        text_lower = grievance.raw_text.lower()
        category = "Pothole / Road Damage"
        dept_code = "MCD"
        for cat, dept in CATEGORY_DEPT_MAP.items():
            if any(kw in text_lower for kw in cat.lower().split("/")):
                category = cat
                dept_code = dept
                break

        dept_id = await self._dept_id_from_code(dept_code)
        await self._s.execute(
            text("""
                UPDATE grievances SET
                  category = :cat, department_id = :dept_id,
                  severity = 50, ai_confidence = 0.75,
                  spam_score = 0.02, status = 'CLASSIFIED', updated_at = now()
                WHERE id = :id
            """),
            {"cat": category, "dept_id": str(dept_id) if dept_id else None, "id": str(grievance.id)},
        )
        return AIEnrichmentResult(
            grievance_id=grievance.id,
            classification=ClassificationResult(category=category, department_code=dept_code, confidence=0.75),
            severity=SeverityScore(score=50, factors=["mock"], priority="MEDIUM"),
            spam=SpamScore(score=0.02, is_spam=False),
            cluster=ClusterMatch(cluster_id=None, is_new_cluster=False, similar_grievance_ids=[], similarity_score=0.0),
            embedding_stored=False,
        )

    async def _dept_id_from_code(self, code: str) -> uuid.UUID | None:
        row = (await self._s.execute(
            text("SELECT id FROM departments WHERE short_code = :code LIMIT 1"),
            {"code": code},
        )).fetchone()
        return uuid.UUID(str(row[0])) if row else None
