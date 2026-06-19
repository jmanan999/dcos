from fastapi import APIRouter

router = APIRouter(prefix="/intake", tags=["Intake"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "intake", "status": "ok"}
