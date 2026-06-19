from fastapi import APIRouter

router = APIRouter(prefix="/integration", tags=["Integration"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "integration", "status": "ok"}
