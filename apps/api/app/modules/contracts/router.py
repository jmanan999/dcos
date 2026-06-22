from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_db, require_permission
from app.core.permissions import P
from app.modules.contracts.schemas import (
    BudgetAllocationCreate,
    BudgetAllocationRead,
    BudgetOutcomeReport,
    ContractCreate,
    ContractorScorecardReport,
    ContractPerformanceRead,
    ContractRead,
    ContractUpdate,
    WardRepresentativeRead,
)
from app.modules.contracts.service import ContractsService

router = APIRouter(prefix="/contracts", tags=["Contracts"])

_CMAuth = Annotated[object, Depends(require_permission(P.ANALYTICS_VIEW_ANY))]
_AdminAuth = Annotated[object, Depends(require_permission(P.DEPARTMENT_MANAGE))]


async def _get_svc(db: AsyncSession = Depends(get_db)) -> ContractsService:
    await db.execute(text("SELECT set_config('app.bypass_rls', 'true', true)"))
    return ContractsService(db)


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "contracts", "status": "ok"}


# ── Static sub-paths must come before /{contract_id} to avoid capture ────────


@router.get("/scorecard/public", response_model=ContractorScorecardReport)
async def contractor_scorecard_public(
    svc: ContractsService = Depends(_get_svc),
) -> ContractorScorecardReport:
    """Public endpoint — no auth. Lists all contractors ranked by post-work complaint spike."""
    return await svc.get_contractor_scorecard()


@router.get("/budget/allocations", response_model=list[BudgetAllocationRead])
async def list_budget_allocations(
    _: _CMAuth,
    fiscal_year: str | None = None,
    dept_id: str | None = None,
    svc: ContractsService = Depends(_get_svc),
) -> list[BudgetAllocationRead]:
    return await svc.list_budget_allocations(fiscal_year=fiscal_year, dept_id=dept_id)


@router.post(
    "/budget/allocations", response_model=BudgetAllocationRead, status_code=status.HTTP_201_CREATED
)
async def create_budget_allocation(
    payload: BudgetAllocationCreate,
    current_user: CurrentUser,
    _: _AdminAuth,
    svc: ContractsService = Depends(_get_svc),
    db: AsyncSession = Depends(get_db),
) -> BudgetAllocationRead:
    result = await svc.create_budget_allocation(payload, user_id=str(current_user.sub))
    await db.commit()
    return result


@router.get("/budget/outcomes", response_model=BudgetOutcomeReport)
async def get_budget_outcomes(
    _: _CMAuth,
    fiscal_year: str = "2024-25",
    period: str = "Annual",
    svc: ContractsService = Depends(_get_svc),
) -> BudgetOutcomeReport:
    return await svc.get_budget_outcomes(fiscal_year=fiscal_year, period=period)


@router.get("/ward-reps", response_model=list[WardRepresentativeRead])
async def list_ward_reps(
    party: str | None = None,
    svc: ContractsService = Depends(_get_svc),
) -> list[WardRepresentativeRead]:
    """Public endpoint — no auth. Returns ward councillor data."""
    return await svc.list_ward_representatives(party=party)


# ── Contract CRUD ─────────────────────────────────────────────────────────────


@router.get("", response_model=list[ContractRead])
async def list_contracts(
    _: _CMAuth,
    status_filter: str | None = Query(None, alias="status"),
    dept_id: str | None = None,
    svc: ContractsService = Depends(_get_svc),
) -> list[ContractRead]:
    return await svc.list_contracts(status=status_filter, dept_id=dept_id)


@router.post("", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
async def create_contract(
    payload: ContractCreate,
    current_user: CurrentUser,
    _: _AdminAuth,
    svc: ContractsService = Depends(_get_svc),
    db: AsyncSession = Depends(get_db),
) -> ContractRead:
    result = await svc.create_contract(payload, user_id=str(current_user.sub))
    await db.commit()
    return result


@router.get("/{contract_id}", response_model=ContractRead)
async def get_contract(
    contract_id: uuid.UUID,
    _: _CMAuth,
    svc: ContractsService = Depends(_get_svc),
) -> ContractRead:
    result = await svc.get_contract(contract_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    return result


@router.patch("/{contract_id}", response_model=ContractRead)
async def update_contract(
    contract_id: uuid.UUID,
    payload: ContractUpdate,
    _: _AdminAuth,
    svc: ContractsService = Depends(_get_svc),
    db: AsyncSession = Depends(get_db),
) -> ContractRead:
    result = await svc.update_contract(contract_id, payload)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")
    await db.commit()
    return result


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract(
    contract_id: uuid.UUID,
    _: _AdminAuth,
    svc: ContractsService = Depends(_get_svc),
    db: AsyncSession = Depends(get_db),
) -> None:
    deleted = await svc.delete_contract(contract_id)
    await db.commit()
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contract not found")


@router.post("/{contract_id}/correlate", response_model=ContractPerformanceRead)
async def trigger_correlation(
    contract_id: uuid.UUID,
    _: _AdminAuth,
    svc: ContractsService = Depends(_get_svc),
    db: AsyncSession = Depends(get_db),
) -> ContractPerformanceRead:
    result = await svc.correlate_contract(contract_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Contract must be completed with an end_date to correlate",
        )
    await db.commit()
    return result
