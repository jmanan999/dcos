"""
Integration module service — per-department adapter framework.

Each department can have one adapter (rest | email | file).
Adapters push DCOS status changes to the external system and optionally poll
the external system for updates.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Protocol

import httpx
import structlog
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

log = structlog.get_logger()


class BaseAdapter(Protocol):
    adapter_type: str
    department_id: str

    async def push_status(self, grievance_id: str, status: str, tracking_id: str) -> bool: ...
    async def pull_updates(self) -> list[dict]: ...


class RestAdapter:
    """Generic REST webhook adapter."""

    adapter_type = "rest"

    def __init__(self, department_id: str, endpoint_url: str, auth_header: str | None = None):
        self.department_id = department_id
        self._endpoint = endpoint_url
        self._auth = auth_header

    async def push_status(self, grievance_id: str, status: str, tracking_id: str) -> bool:
        headers = {"Content-Type": "application/json"}
        if self._auth:
            headers["Authorization"] = self._auth
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.post(
                    self._endpoint,
                    json={
                        "grievance_id": grievance_id,
                        "tracking_id": tracking_id,
                        "status": status,
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                    headers=headers,
                )
            return resp.status_code < 400
        except Exception as exc:
            log.error("integration.rest.push_failed", error=str(exc))
            return False

    async def pull_updates(self) -> list[dict]:
        return []


class IntegrationService:
    def __init__(self, session: AsyncSession) -> None:
        self._db = session
        self._adapters: dict[str, BaseAdapter] = {}

    def register_adapter(self, adapter: BaseAdapter) -> None:
        self._adapters[adapter.department_id] = adapter

    async def push_status_to_dept(self, grievance_id: uuid.UUID, status: str) -> dict[str, str]:
        result = await self._db.execute(
            text("SELECT tracking_id, department_id FROM grievances WHERE id = CAST(:id AS uuid)"),
            {"id": str(grievance_id)},
        )
        row = result.fetchone()
        if not row:
            return {"status": "not_found"}

        tracking_id, dept_id = row
        adapter = self._adapters.get(str(dept_id))
        if not adapter:
            return {"status": "no_adapter", "department_id": str(dept_id)}

        success = await adapter.push_status(str(grievance_id), status, tracking_id)
        log.info("integration.push", grievance_id=str(grievance_id), status=status, success=success)
        return {"status": "sent" if success else "failed"}

    async def get_adapter_status(self) -> list[dict]:
        return [
            {"department_id": dept_id, "adapter_type": getattr(a, "adapter_type", "unknown")}
            for dept_id, a in self._adapters.items()
        ]
