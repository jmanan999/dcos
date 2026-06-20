from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.dependencies import get_optional_user
from app.modules.chatbot.schemas import ChatRequest, ChatResponse
from app.modules.chatbot.service import ChatbotService

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"module": "chatbot", "status": "ok"}


@router.post(
    "/ask",
    response_model=ChatResponse,
    summary="Ask the DCOS assistant a question (FAQs + AI fallback)",
)
async def ask(
    body: ChatRequest,
    user: Annotated[object, Depends(get_optional_user)],
) -> ChatResponse:
    if not settings.FEATURE_CHATBOT:
        raise HTTPException(status_code=503, detail="Chatbot is disabled")

    svc = ChatbotService()
    return await svc.answer(body)
