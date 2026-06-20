from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query
from fastapi.responses import PlainTextResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db, require_permission
from app.core.permissions import P
from app.modules.reporting.service import ReportingService

router = APIRouter(prefix="/reporting", tags=["Reporting"])

_ReportAuth = Annotated[object, Depends(require_permission(P.REPORT_GENERATE))]


async def _get_svc(db: AsyncSession = Depends(get_db)) -> ReportingService:
    await db.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    return ReportingService(db)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "reporting", "status": "ok"}


@router.get("/export/grievances")
async def export_grievances_csv(
    _: _ReportAuth,
    department_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    days: int = Query(default=30, ge=1, le=365),
    svc: ReportingService = Depends(_get_svc),
) -> PlainTextResponse:
    """Export grievances as CSV (max 10,000 rows, last N days)."""
    csv_text, _ = await svc.export_csv(department_id=department_id, status=status, days=days)
    filename = f"dcos_grievances_{days}d.csv"
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/dept-scorecard")
async def export_dept_scorecard(
    _: _ReportAuth,
    svc: ReportingService = Depends(_get_svc),
) -> PlainTextResponse:
    """Export department scorecard as CSV."""
    csv_text, _ = await svc.dept_scorecard_csv()
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="dcos_dept_scorecard.csv"'},
    )


@router.get("/export/ward-stats")
async def export_ward_stats(
    _: _ReportAuth,
    svc: ReportingService = Depends(_get_svc),
) -> PlainTextResponse:
    """Export ward-level statistics as CSV."""
    csv_text, _ = await svc.ward_stats_csv()
    return PlainTextResponse(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="dcos_ward_stats.csv"'},
    )
