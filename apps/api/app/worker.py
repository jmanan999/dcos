"""
Async background workers — Arq task queue (Redis).

Workers process outbox events:
  grievance.created  → ai.enrich_grievance  → classify + embed + dedup
  grievance.enriched → routing.assign       → (Epic 6) assign to officer + set SLA

Start:  arq app.worker.WorkerSettings
Or:     python -m app.worker  (for local dev)
"""
from __future__ import annotations

import asyncio
import uuid
from datetime import timedelta
from typing import Any

import structlog
from sqlalchemy import text

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.logging import setup_logging

log = structlog.get_logger()


# ── AI enrichment job ─────────────────────────────────────────────────────────

async def enrich_grievance(ctx: dict, grievance_id: str) -> dict[str, Any]:
    """Classify, score, embed and cluster a single grievance."""
    setup_logging()
    from app.modules.ai.service import AIService

    async with AsyncSessionLocal() as session:
        # Bypass RLS for worker (system actor)
        await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        svc = AIService(session)
        result = await svc.enrich(uuid.UUID(grievance_id))
        await session.commit()

    if result:
        log.info(
            "worker.enrich.done",
            grievance_id=grievance_id,
            category=result.classification.category,
            severity=result.severity.score,
        )
        return result.model_dump(mode="json")
    return {"error": "grievance not found"}


# ── Routing / assignment job ──────────────────────────────────────────────────

async def assign_grievance(ctx: dict, grievance_id: str) -> dict[str, Any]:
    """Assign a classified grievance to the right officer + set SLA clock."""
    setup_logging()
    from app.modules.routing.service import RoutingService

    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        svc = RoutingService(session)
        result = await svc.assign(uuid.UUID(grievance_id))
        await session.commit()

    log.info("worker.assign.done", grievance_id=grievance_id, status=result.status)
    return result.model_dump(mode="json")


# ── SLA escalation job ────────────────────────────────────────────────────────

async def check_sla_breaches(ctx: dict) -> dict[str, int]:
    """Detect SLA-breached grievances and escalate up the ladder."""
    setup_logging()
    from app.modules.sla.service import SLAService

    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        svc = SLAService(session)
        result = await svc.check_and_escalate()

    return result


# ── Outbox relay job ──────────────────────────────────────────────────────────

async def relay_outbox(ctx: dict) -> dict[str, int]:
    """
    Pull unprocessed outbox events and dispatch to the right worker.
    Run on a short interval (every 5s) via the cron setting below.
    """
    from app.modules.platform.models import OutboxEvent
    from sqlalchemy import update

    dispatched = 0
    async with AsyncSessionLocal() as session:
        await session.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
        result = await session.execute(
            text("""
                SELECT id, event_type, aggregate_id
                FROM outbox_events
                WHERE processed_at IS NULL
                ORDER BY created_at
                LIMIT 50
                FOR UPDATE SKIP LOCKED
            """)
        )
        rows = result.fetchall()

        for row in rows:
            event_id, event_type, aggregate_id = str(row[0]), row[1], row[2]
            try:
                queue = ctx.get("redis")
                if event_type == "grievance.created" and queue:
                    await queue.enqueue_job("enrich_grievance", aggregate_id)
                elif event_type == "grievance.enriched" and queue:
                    await queue.enqueue_job("assign_grievance", aggregate_id)

                await session.execute(
                    text("UPDATE outbox_events SET processed_at = now() WHERE id = :id"),
                    {"id": event_id},
                )
                dispatched += 1
            except Exception as exc:
                log.error("worker.relay.failed", event_id=event_id, error=str(exc))

        await session.commit()

    return {"dispatched": dispatched}


# ── Arq worker settings ───────────────────────────────────────────────────────

class WorkerSettings:
    functions = [enrich_grievance, assign_grievance, check_sla_breaches, relay_outbox]
    redis_settings_str = settings.REDIS_URL
    max_jobs = 20
    job_timeout = 120
    on_startup = None
    on_shutdown = None

    cron_jobs = [
        # Relay outbox events every 5 seconds
        type("CronJob", (), {
            "name": "relay_outbox",
            "coroutine": relay_outbox,
            "minute": None,
            "second": {0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55},
        })(),
    ]


# ── Local dev runner ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import arq
    asyncio.run(arq.run_worker(WorkerSettings))
