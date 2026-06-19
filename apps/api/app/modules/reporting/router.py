from fastapi import APIRouter

router = APIRouter(prefix="/reporting", tags=["Reporting"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "reporting", "status": "ok"}
