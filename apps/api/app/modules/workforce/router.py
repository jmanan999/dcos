from fastapi import APIRouter

router = APIRouter(prefix="/workforce", tags=["Workforce"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "workforce", "status": "ok"}
