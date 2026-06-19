from fastapi import APIRouter

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "analytics", "status": "ok"}
