"""Contracts service — CRUD + contractor performance correlation."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.contracts.schemas import (
    BudgetAllocationCreate,
    BudgetAllocationRead,
    BudgetOutcomeReport,
    BudgetOutcomeRow,
    ContractCreate,
    ContractorScorecardReport,
    ContractorScorecardRow,
    ContractPerformanceRead,
    ContractProject,
    ContractRead,
    ContractUpdate,
    WardRepresentativeRead,
)

log = structlog.get_logger()

# Map contract type → complaint categories for correlation
_TYPE_CATEGORIES: dict[str, list[str]] = {
    "road": ["Pothole / Road Damage", "Road Repair Required", "Street Damaged"],
    "drainage": ["Sewage Overflow", "Drain Blocked", "Waterlogging"],
    "electrical": ["Streetlight Not Working", "Electrical Hazard"],
    "water": ["No Water Supply", "Water Leakage", "Dirty Water Supply"],
    "sanitation": ["Garbage Not Collected", "Sanitation Issue", "Open Defecation"],
    "other": [],
}

_DAILY_COST_PER_COMPLAINT = 150.0  # ₹/day NIPFP proxy (same as analytics)


class ContractsService:
    def __init__(self, session: AsyncSession) -> None:
        self._db = session

    # ── Contract CRUD ─────────────────────────────────────────────────────────

    async def list_contracts(
        self, status: str | None = None, dept_id: str | None = None
    ) -> list[ContractRead]:
        where = "WHERE 1=1"
        params: dict = {}
        if status:
            where += " AND c.status = :status"
            params["status"] = status
        if dept_id:
            where += " AND c.department_id = :dept_id"
            params["dept_id"] = dept_id

        rows = (
            await self._db.execute(
                text(f"""
                    SELECT c.id, c.contractor_name, c.gst_number, c.department_id,
                           d.name AS department_name, c.ward_ids, c.contract_type,
                           c.value_lakh, c.tender_id, c.start_date, c.end_date,
                           c.status, c.notes, c.created_at, c.updated_at,
                           cp.id AS perf_id, cp.computed_at, cp.complaint_category,
                           cp.baseline_weekly_rate, cp.post_work_weekly_rate,
                           cp.spike_pct, cp.is_flagged, cp.economic_waste_lakh
                    FROM contracts c
                    LEFT JOIN departments d ON d.id = c.department_id
                    LEFT JOIN LATERAL (
                        SELECT * FROM contractor_performance
                        WHERE contract_id = c.id
                        ORDER BY computed_at DESC LIMIT 1
                    ) cp ON true
                    {where}
                    ORDER BY c.created_at DESC
                """).bindparams(**params)
            )
        ).fetchall()

        return [self._row_to_read(r) for r in rows]

    async def get_contract(self, contract_id: uuid.UUID) -> ContractRead | None:
        row = (
            await self._db.execute(
                text("""
                    SELECT c.id, c.contractor_name, c.gst_number, c.department_id,
                           d.name AS department_name, c.ward_ids, c.contract_type,
                           c.value_lakh, c.tender_id, c.start_date, c.end_date,
                           c.status, c.notes, c.created_at, c.updated_at,
                           cp.id AS perf_id, cp.computed_at, cp.complaint_category,
                           cp.baseline_weekly_rate, cp.post_work_weekly_rate,
                           cp.spike_pct, cp.is_flagged, cp.economic_waste_lakh
                    FROM contracts c
                    LEFT JOIN departments d ON d.id = c.department_id
                    LEFT JOIN LATERAL (
                        SELECT * FROM contractor_performance
                        WHERE contract_id = c.id
                        ORDER BY computed_at DESC LIMIT 1
                    ) cp ON true
                    WHERE c.id = :id
                """).bindparams(id=contract_id)
            )
        ).fetchone()
        return self._row_to_read(row) if row else None

    async def create_contract(self, payload: ContractCreate, user_id: str) -> ContractRead:
        cid = uuid.uuid4()
        await self._db.execute(
            text("""
                INSERT INTO contracts
                    (id, contractor_name, gst_number, department_id, ward_ids,
                     contract_type, value_lakh, tender_id, start_date, end_date,
                     status, notes, created_by)
                VALUES (:id, :cname, :gst, :dept, :ward_ids::uuid[], :ctype, :val,
                        :tid, :sd, :ed, :status, :notes, :uid)
            """).bindparams(
                id=cid,
                cname=payload.contractor_name,
                gst=payload.gst_number,
                dept=payload.department_id,
                ward_ids=[str(w) for w in payload.ward_ids],
                ctype=payload.contract_type,
                val=payload.value_lakh,
                tid=payload.tender_id,
                sd=payload.start_date,
                ed=payload.end_date,
                status=payload.status,
                notes=payload.notes,
                uid=user_id,
            )
        )
        result = await self.get_contract(cid)
        assert result is not None
        return result

    async def update_contract(
        self, contract_id: uuid.UUID, payload: ContractUpdate
    ) -> ContractRead | None:
        updates = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
        if not updates:
            return await self.get_contract(contract_id)

        set_clauses = ", ".join(f"{k} = :{k}" for k in updates)
        updates["id"] = contract_id
        await self._db.execute(
            text(
                f"UPDATE contracts SET {set_clauses}, updated_at = now() WHERE id = :id"
            ).bindparams(**updates)
        )
        return await self.get_contract(contract_id)

    async def delete_contract(self, contract_id: uuid.UUID) -> bool:
        result = await self._db.execute(
            text("DELETE FROM contracts WHERE id = :id").bindparams(id=contract_id)
        )
        return result.rowcount > 0

    # ── E3.2: Contractor performance correlation ──────────────────────────────

    async def correlate_contract(self, contract_id: uuid.UUID) -> ContractPerformanceRead | None:
        """
        Compute complaint rate before start_date vs after end_date for this contract's
        wards and relevant category. Stores result in contractor_performance.
        Only runs if the contract is completed and has an end_date.
        """
        row = (
            await self._db.execute(
                text("""
                    SELECT c.ward_ids, c.contract_type, c.value_lakh,
                           c.start_date, c.end_date, c.status
                    FROM contracts c WHERE c.id = :id
                """).bindparams(id=contract_id)
            )
        ).fetchone()

        if not row or row[5] != "completed" or not row[4]:
            return None

        ward_ids, contract_type, _, start_date, end_date = (
            row[0],
            row[1],
            float(row[2]),
            row[3],
            row[4],
        )
        categories = _TYPE_CATEGORIES.get(contract_type, [])
        if not ward_ids:
            return None

        cat_filter = ""
        cat_params: dict = {}
        if categories:
            cat_placeholders = ", ".join(f":cat{i}" for i in range(len(categories)))
            cat_filter = f" AND category IN ({cat_placeholders})"
            cat_params = {f"cat{i}": c for i, c in enumerate(categories)}

        rates = (
            await self._db.execute(
                text(f"""
                    SELECT
                        COALESCE(
                            COUNT(*) FILTER (
                                WHERE created_at BETWEEN :sd_90 AND :start_date
                            )::float / NULLIF(90.0 / 7, 0),
                            0
                        ) AS baseline_weekly_rate,
                        COALESCE(
                            COUNT(*) FILTER (
                                WHERE created_at BETWEEN :end_date AND :ed_180
                            )::float / NULLIF(180.0 / 7, 0),
                            0
                        ) AS post_work_weekly_rate
                    FROM grievances
                    WHERE ward_id = ANY(:ward_ids::uuid[])
                    {cat_filter}
                """).bindparams(
                    sd_90=_days_before(start_date, 90),
                    start_date=start_date,
                    end_date=end_date,
                    ed_180=_days_after(end_date, 180),
                    ward_ids=[str(w) for w in ward_ids],
                    **cat_params,
                )
            )
        ).fetchone()

        baseline = float(rates[0]) if rates else 0.0
        post = float(rates[1]) if rates else 0.0
        spike_pct = ((post - baseline) / max(baseline, 0.01)) * 100 if baseline > 0 else None
        is_flagged = spike_pct is not None and spike_pct > 150
        waste = (
            (spike_pct / 100 * baseline * 7 * _DAILY_COST_PER_COMPLAINT / 100_000)
            if is_flagged and spike_pct
            else None
        )

        perf_id = uuid.uuid4()
        category_label = categories[0] if categories else None
        await self._db.execute(
            text("""
                INSERT INTO contractor_performance
                    (id, contract_id, complaint_category, baseline_weekly_rate,
                     post_work_weekly_rate, spike_pct, is_flagged, economic_waste_lakh)
                VALUES (:id, :cid, :cat, :base, :post, :spike, :flagged, :waste)
            """).bindparams(
                id=perf_id,
                cid=contract_id,
                cat=category_label,
                base=baseline,
                post=post,
                spike=spike_pct,
                flagged=is_flagged,
                waste=waste,
            )
        )
        return ContractPerformanceRead(
            id=perf_id,
            contract_id=contract_id,
            computed_at=datetime.now(UTC),
            complaint_category=category_label,
            baseline_weekly_rate=baseline,
            post_work_weekly_rate=post,
            spike_pct=spike_pct,
            is_flagged=is_flagged,
            economic_waste_lakh=waste,
        )

    async def correlate_all_completed(self) -> int:
        """Weekly job: correlate all completed contracts lacking fresh performance data."""
        rows = (
            await self._db.execute(
                text("""
                    SELECT c.id FROM contracts c
                    WHERE c.status = 'completed'
                      AND c.end_date IS NOT NULL
                      AND NOT EXISTS (
                          SELECT 1 FROM contractor_performance cp
                          WHERE cp.contract_id = c.id
                            AND cp.computed_at > now() - interval '7 days'
                      )
                """)
            )
        ).fetchall()

        count = 0
        for (cid,) in rows:
            try:
                result = await self.correlate_contract(cid)
                if result:
                    count += 1
            except Exception as exc:
                log.error("contracts.correlate.failed", contract_id=str(cid), error=str(exc))
        return count

    # ── Contractor Scorecard (public) ─────────────────────────────────────────

    async def get_contractor_scorecard(self) -> ContractorScorecardReport:
        rows = (
            await self._db.execute(
                text("""
                    SELECT
                        c.id::text, c.contractor_name, c.gst_number,
                        c.value_lakh, c.contract_type, c.start_date::text, c.end_date::text,
                        d.name AS department_name,
                        cp.spike_pct, cp.is_flagged, cp.economic_waste_lakh
                    FROM contracts c
                    LEFT JOIN departments d ON d.id = c.department_id
                    LEFT JOIN LATERAL (
                        SELECT spike_pct, is_flagged, economic_waste_lakh
                        FROM contractor_performance
                        WHERE contract_id = c.id
                        ORDER BY computed_at DESC LIMIT 1
                    ) cp ON true
                    ORDER BY c.contractor_name, c.start_date
                """)
            )
        ).fetchall()

        contractor_map: dict[str, dict] = {}
        for r in rows:
            cid, name, gst, val, ctype, sd, ed, dept, spike, flagged, waste = (
                r[0],
                r[1],
                r[2],
                float(r[3]),
                r[4],
                r[5],
                r[6],
                r[7],
                float(r[8]) if r[8] is not None else None,
                bool(r[10]) if r[10] is not None else False,
                float(r[10]) if r[10] is not None else None,
            )
            if name not in contractor_map:
                contractor_map[name] = {
                    "contractor_name": name,
                    "gst_number": gst,
                    "total_value_lakh": 0.0,
                    "spikes": [],
                    "flagged_contracts": 0,
                    "total_waste": 0.0,
                    "projects": [],
                }
            entry = contractor_map[name]
            entry["total_value_lakh"] += val
            if spike is not None:
                entry["spikes"].append(spike)
            if flagged:
                entry["flagged_contracts"] += 1
            if waste:
                entry["total_waste"] += waste
            entry["projects"].append(
                ContractProject(
                    contract_id=cid,
                    department=dept or "Unknown",
                    contract_type=ctype,
                    value_lakh=val,
                    start_date=sd or "",
                    end_date=ed,
                    spike_pct=float(r[8]) if r[8] is not None else None,
                    is_flagged=bool(r[9]) if r[9] is not None else False,
                    economic_waste_lakh=float(r[10]) if r[10] is not None else None,
                )
            )

        scorecard_rows = []
        total_waste = 0.0
        flagged_count = 0
        for entry in contractor_map.values():
            spikes = entry["spikes"]
            avg_spike = sum(spikes) / len(spikes) if spikes else None
            max_spike = max(spikes) if spikes else None
            waste_val = entry["total_waste"]
            total_waste += waste_val
            if entry["flagged_contracts"] > 0:
                flagged_count += 1
            risk = (
                "red" if (avg_spike or 0) > 150 else "yellow" if (avg_spike or 0) > 75 else "green"
            )
            scorecard_rows.append(
                ContractorScorecardRow(
                    contractor_name=entry["contractor_name"],
                    gst_number=entry["gst_number"],
                    total_contracts=len(entry["projects"]),
                    total_value_lakh=round(entry["total_value_lakh"], 2),
                    avg_spike_pct=round(avg_spike, 1) if avg_spike is not None else None,
                    max_spike_pct=round(max_spike, 1) if max_spike is not None else None,
                    flagged_contracts=entry["flagged_contracts"],
                    total_economic_waste_lakh=round(waste_val, 2),
                    risk_level=risk,
                    projects=entry["projects"],
                )
            )

        scorecard_rows.sort(key=lambda r: (r.flagged_contracts, r.avg_spike_pct or 0), reverse=True)
        return ContractorScorecardReport(
            contractors=scorecard_rows,
            total_contractors=len(scorecard_rows),
            flagged_contractors=flagged_count,
            total_estimated_waste_lakh=round(total_waste, 2),
            computed_at=datetime.now(UTC),
        )

    # ── Budget Allocations CRUD ───────────────────────────────────────────────

    async def list_budget_allocations(
        self, fiscal_year: str | None = None, dept_id: str | None = None
    ) -> list[BudgetAllocationRead]:
        where = "WHERE 1=1"
        params: dict = {}
        if fiscal_year:
            where += " AND ba.fiscal_year = :fy"
            params["fy"] = fiscal_year
        if dept_id:
            where += " AND ba.department_id = :dept_id"
            params["dept_id"] = dept_id

        rows = (
            await self._db.execute(
                text(f"""
                    SELECT ba.id, ba.department_id, d.name, ba.fiscal_year,
                           ba.period, ba.amount_crore, ba.notes, ba.created_at
                    FROM budget_allocations ba
                    LEFT JOIN departments d ON d.id = ba.department_id
                    {where}
                    ORDER BY ba.fiscal_year DESC, ba.period
                """).bindparams(**params)
            )
        ).fetchall()

        return [
            BudgetAllocationRead(
                id=r[0],
                department_id=r[1],
                department_name=r[2],
                fiscal_year=r[3],
                period=r[4],
                amount_crore=float(r[5]),
                notes=r[6],
                created_at=r[7],
            )
            for r in rows
        ]

    async def create_budget_allocation(
        self, payload: BudgetAllocationCreate, user_id: str
    ) -> BudgetAllocationRead:
        bid = uuid.uuid4()
        await self._db.execute(
            text("""
                INSERT INTO budget_allocations
                    (id, department_id, fiscal_year, period, amount_crore, notes, created_by)
                VALUES (:id, :dept, :fy, :period, :amount, :notes, :uid)
            """).bindparams(
                id=bid,
                dept=payload.department_id,
                fy=payload.fiscal_year,
                period=payload.period,
                amount=payload.amount_crore,
                notes=payload.notes,
                uid=user_id,
            )
        )
        dept_name = (
            await self._db.execute(
                text("SELECT name FROM departments WHERE id = :id").bindparams(
                    id=payload.department_id
                )
            )
        ).scalar()
        return BudgetAllocationRead(
            id=bid,
            department_id=payload.department_id,
            department_name=dept_name,
            fiscal_year=payload.fiscal_year,
            period=payload.period,
            amount_crore=payload.amount_crore,
            notes=payload.notes,
            created_at=datetime.now(UTC),
        )

    async def get_budget_outcomes(
        self, fiscal_year: str = "2024-25", period: str = "Annual"
    ) -> BudgetOutcomeReport:
        """
        For each department with a budget allocation in the given period,
        compare complaint volumes before vs after budget period.
        """
        rows = (
            await self._db.execute(
                text("""
                    SELECT
                        d.id::text,
                        d.name,
                        ba.amount_crore,
                        -- complaints in 6 months before fiscal year start
                        COUNT(g.id) FILTER (
                            WHERE g.created_at < '2024-04-01'
                              AND g.created_at >= '2023-10-01'
                        ) AS complaints_before,
                        -- complaints in fiscal year
                        COUNT(g.id) FILTER (
                            WHERE g.created_at >= '2024-04-01'
                              AND g.created_at < '2025-04-01'
                        ) AS complaints_after
                    FROM departments d
                    LEFT JOIN budget_allocations ba
                        ON ba.department_id = d.id
                       AND ba.fiscal_year = :fy
                       AND (:period = 'Annual' OR ba.period = :period)
                    LEFT JOIN grievances g ON g.department_id = d.id
                    GROUP BY d.id, d.name, ba.amount_crore
                    ORDER BY d.name
                """).bindparams(fy=fiscal_year, period=period)
            )
        ).fetchall()

        outcome_rows = []
        total_budget = 0.0
        changes = []
        for r in rows:
            dept_id, dept_name, budget, before, after = (
                str(r[0]),
                r[1],
                float(r[2]) if r[2] else None,
                int(r[3] or 0),
                int(r[4] or 0),
            )
            if budget:
                total_budget += budget
            change = ((after - before) / max(before, 1)) * 100 if before > 0 else None
            if change is not None:
                changes.append(change)
            # ROI grade: negative change = better (fewer complaints after spending)
            if change is None or budget is None:
                grade = "NA"
            elif change < -20:
                grade = "A"
            elif change < -10:
                grade = "B"
            elif change < 0:
                grade = "C"
            elif change < 10:
                grade = "D"
            else:
                grade = "F"
            outcome_rows.append(
                BudgetOutcomeRow(
                    department=dept_name,
                    department_id=dept_id,
                    budget_allocated_crore=budget,
                    complaints_before=before,
                    complaints_after=after,
                    change_pct=round(change, 1) if change is not None else None,
                    economic_drag_before_lakh=round(
                        before * _DAILY_COST_PER_COMPLAINT / 100_000, 2
                    ),
                    economic_drag_after_lakh=round(after * _DAILY_COST_PER_COMPLAINT / 100_000, 2),
                    roi_grade=grade,
                )
            )

        avg_change = round(sum(changes) / len(changes), 1) if changes else None
        return BudgetOutcomeReport(
            fiscal_year=fiscal_year,
            period=period,
            rows=outcome_rows,
            total_budget_crore=round(total_budget, 2),
            avg_complaint_change_pct=avg_change,
            computed_at=datetime.now(UTC),
        )

    # ── Ward Representatives ──────────────────────────────────────────────────

    async def list_ward_representatives(
        self, party: str | None = None
    ) -> list[WardRepresentativeRead]:
        where = "WHERE wr.is_current = true"
        params: dict = {}
        if party:
            where += " AND wr.party = :party"
            params["party"] = party

        rows = (
            await self._db.execute(
                text(f"""
                    SELECT wr.id, wr.ward_id, w.name, w.number,
                           wr.representative_name, wr.party, wr.constituency,
                           wr.term_start, wr.term_end, wr.is_current
                    FROM ward_representatives wr
                    JOIN wards w ON w.id = wr.ward_id
                    {where}
                    ORDER BY w.number
                """).bindparams(**params)
            )
        ).fetchall()

        return [
            WardRepresentativeRead(
                id=r[0],
                ward_id=r[1],
                ward_name=r[2],
                ward_number=r[3],
                representative_name=r[4],
                party=r[5],
                constituency=r[6],
                term_start=r[7],
                term_end=r[8],
                is_current=r[9],
            )
            for r in rows
        ]

    # ── Internal helpers ──────────────────────────────────────────────────────

    @staticmethod
    def _row_to_read(r) -> ContractRead:
        perf = None
        if r[15] is not None:
            perf = ContractPerformanceRead(
                id=r[15],
                contract_id=r[0],
                computed_at=r[16],
                complaint_category=r[17],
                baseline_weekly_rate=float(r[18]) if r[18] is not None else None,
                post_work_weekly_rate=float(r[19]) if r[19] is not None else None,
                spike_pct=float(r[20]) if r[20] is not None else None,
                is_flagged=bool(r[21]),
                economic_waste_lakh=float(r[22]) if r[22] is not None else None,
            )
        return ContractRead(
            id=r[0],
            contractor_name=r[1],
            gst_number=r[2],
            department_id=r[3],
            department_name=r[4],
            ward_ids=r[5] or [],
            contract_type=r[6],
            value_lakh=float(r[7]),
            tender_id=r[8],
            start_date=r[9],
            end_date=r[10],
            status=r[11],
            notes=r[12],
            created_at=r[13],
            updated_at=r[14],
            performance=perf,
        )


def _days_before(d, n: int):
    from datetime import timedelta

    return d - timedelta(days=n)


def _days_after(d, n: int):
    from datetime import timedelta

    return d + timedelta(days=n)
