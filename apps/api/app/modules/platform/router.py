from fastapi import APIRouter

router = APIRouter(prefix="/platform", tags=["Platform"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "platform", "status": "ok"}
