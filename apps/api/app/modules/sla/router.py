from fastapi import APIRouter

router = APIRouter(prefix="/sla", tags=["SLA"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "sla", "status": "ok"}
