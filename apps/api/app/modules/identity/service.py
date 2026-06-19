"""Identity service — user management, officer CRUD, phone-claim linking."""
from __future__ import annotations

import uuid

from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import TokenClaims
from app.modules.identity.models import Department, Officer, User
from app.modules.identity.repository import DepartmentRepository, OfficerRepository, UserRepository


class IdentityService:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session
        self._users = UserRepository(session)
        self._depts = DepartmentRepository(session)
        self._officers = OfficerRepository(session)

    # ── Me ────────────────────────────────────────────────────────────────────

    async def get_me(self, claims: TokenClaims) -> User | None:
        return await self._users.get(uuid.UUID(claims.user_id))

    async def upsert_me(self, claims: TokenClaims) -> User:
        """Create the User row on first login if it doesn't exist yet."""
        user = await self._users.get(uuid.UUID(claims.user_id))
        if user:
            return user
        return await self._users.create(
            id=uuid.UUID(claims.user_id),
            role=claims.role,
            name=claims.name,
        )

    async def update_me(
        self,
        user_id: uuid.UUID,
        name: str | None,
        language_pref: str | None,
    ) -> User | None:
        updates: dict[str, object] = {}
        if name is not None:
            updates["name"] = name
        if language_pref is not None:
            updates["language_pref"] = language_pref
        if updates:
            await self._s.execute(update(User).where(User.id == user_id).values(**updates))
            await self._s.flush()
        return await self._users.get(user_id)

    # ── Phone claim ───────────────────────────────────────────────────────────

    async def claim_anonymous_grievances(self, user_id: uuid.UUID, phone: str) -> int:
        """
        After a citizen verifies their phone, back-fill citizen_id on all
        anonymous grievances that were filed with that phone number.
        """
        result = await self._s.execute(
            text("""
                UPDATE grievances
                SET citizen_id = :uid, is_anonymous = false
                WHERE citizen_phone = :phone
                  AND citizen_id IS NULL
            """),
            {"uid": str(user_id), "phone": phone},
        )
        return result.rowcount  # type: ignore[return-value]

    # ── Departments ───────────────────────────────────────────────────────────

    async def list_departments(self, active_only: bool = True) -> list[Department]:
        if active_only:
            return await self._depts.list_active()
        result = await self._s.execute(select(Department).order_by(Department.name))
        return list(result.scalars().all())

    async def get_department(self, dept_id: uuid.UUID) -> Department | None:
        return await self._depts.get(dept_id)

    # ── Officers ──────────────────────────────────────────────────────────────

    async def list_officers(
        self,
        claims: TokenClaims,
        dept_id: uuid.UUID | None = None,
    ) -> list[Officer]:
        """dept_admins and field_officers are scoped to their department."""
        if claims.role in ("field_officer", "dept_admin"):
            if not claims.department_id:
                return []
            return await self._officers.list_by_department(uuid.UUID(claims.department_id))

        # wide roles — optional dept_id filter
        if dept_id:
            return await self._officers.list_by_department(dept_id)
        result = await self._s.execute(
            select(Officer).order_by(Officer.department_id, Officer.id)
        )
        return list(result.scalars().all())

    async def get_officer(self, officer_id: uuid.UUID) -> Officer | None:
        return await self._officers.get(officer_id)

    async def create_officer(
        self,
        user_id: uuid.UUID,
        department_id: uuid.UUID,
        designation: str | None,
        employee_id: str | None,
        max_active_cases: int,
    ) -> Officer:
        officer = Officer(
            user_id=user_id,
            department_id=department_id,
            designation=designation,
            employee_id=employee_id,
            max_active_cases=max_active_cases,
        )
        self._s.add(officer)
        await self._s.flush()
        return officer

    async def update_officer(
        self,
        officer_id: uuid.UUID,
        claims: TokenClaims,
        designation: str | None,
        is_available: bool | None,
        max_active_cases: int | None,
    ) -> Officer | None:
        officer = await self._officers.get(officer_id)
        if not officer:
            return None
        if claims.role == "dept_admin" and claims.department_id:
            if str(officer.department_id) != claims.department_id:
                return None
        updates: dict[str, object] = {}
        if designation is not None:
            updates["designation"] = designation
        if is_available is not None:
            updates["is_available"] = is_available
        if max_active_cases is not None:
            updates["max_active_cases"] = max_active_cases
        if updates:
            await self._s.execute(update(Officer).where(Officer.id == officer_id).values(**updates))
            await self._s.flush()
        return await self._officers.get(officer_id)
