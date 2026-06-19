from fastapi import APIRouter

router = APIRouter(prefix="/citizen", tags=["Citizen"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "citizen", "status": "ok"}
