from fastapi import APIRouter

router = APIRouter(prefix="/routing", tags=["Routing"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "routing", "status": "ok"}
