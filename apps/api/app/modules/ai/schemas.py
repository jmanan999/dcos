from __future__ import annotations

import uuid

from pydantic import BaseModel, Field


class ClassificationResult(BaseModel):
    category: str
    subcategory: str | None = None
    department_code: str
    confidence: float = Field(..., ge=0, le=1)
    language: str = "hi"
    translated_text: str | None = None


class SeverityScore(BaseModel):
    score: int = Field(..., ge=1, le=100)
    factors: list[str]
    priority: str  # CRITICAL | HIGH | MEDIUM | LOW


class SpamScore(BaseModel):
    score: float = Field(..., ge=0, le=1)  # 0 = clean, 1 = spam
    is_spam: bool
    reason: str | None = None


class ClusterMatch(BaseModel):
    cluster_id: uuid.UUID | None = None
    is_new_cluster: bool
    similar_grievance_ids: list[uuid.UUID]
    similarity_score: float


class AIEnrichmentResult(BaseModel):
    grievance_id: uuid.UUID
    classification: ClassificationResult
    severity: SeverityScore
    spam: SpamScore
    cluster: ClusterMatch
    embedding_stored: bool


class FeedbackLabelCreate(BaseModel):
    grievance_id: uuid.UUID
    corrected_category: str | None = None
    corrected_department_code: str | None = None
    correction_note: str | None = None
