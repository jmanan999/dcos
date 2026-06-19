from fastapi import APIRouter

router = APIRouter(prefix="/ai", tags=["AI"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "ai", "status": "ok"}
