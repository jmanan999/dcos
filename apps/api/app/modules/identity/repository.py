"""Identity repositories — users, departments, officers."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.identity.models import Department, Officer, User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get(self, user_id: uuid.UUID) -> User | None:
        result = await self._s.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_phone(self, phone: str) -> User | None:
        result = await self._s.execute(select(User).where(User.phone == phone))
        return result.scalar_one_or_none()

    async def get_by_auth_uid(self, auth_uid: str) -> User | None:
        result = await self._s.execute(select(User).where(User.auth_uid == auth_uid))
        return result.scalar_one_or_none()

    async def create(self, **kwargs: object) -> User:
        user = User(**kwargs)
        self._s.add(user)
        await self._s.flush()
        return user


class DepartmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get(self, dept_id: uuid.UUID) -> Department | None:
        result = await self._s.execute(select(Department).where(Department.id == dept_id))
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str) -> Department | None:
        result = await self._s.execute(
            select(Department).where(Department.short_code == code)
        )
        return result.scalar_one_or_none()

    async def list_active(self) -> list[Department]:
        result = await self._s.execute(
            select(Department).where(Department.is_active.is_(True)).order_by(Department.name)
        )
        return list(result.scalars().all())


class OfficerRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._s = session

    async def get(self, officer_id: uuid.UUID) -> Officer | None:
        result = await self._s.execute(select(Officer).where(Officer.id == officer_id))
        return result.scalar_one_or_none()

    async def list_by_department(self, dept_id: uuid.UUID) -> list[Officer]:
        result = await self._s.execute(
            select(Officer)
            .where(Officer.department_id == dept_id, Officer.is_available.is_(True))
            .order_by(Officer.id)
        )
        return list(result.scalars().all())
