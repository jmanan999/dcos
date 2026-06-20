from __future__ import annotations

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    language: str = Field(default="hi", pattern="^(hi|en)$", description="Language code (hi or en)")
    conversation_id: str | None = None


class FAQMatch(BaseModel):
    matched: bool
    question_en: str | None = None
    question_hi: str | None = None
    answer_en: str | None = None
    answer_hi: str | None = None
    navigation_action: str | None = Field(
        default=None,
        description="Suggested client-side route or action, e.g. /file, /track",
    )


class ChatResponse(BaseModel):
    reply: str = Field(..., description="Response text in the requested language")
    language: str
    is_faq: bool = Field(default=False, description="Whether this was answered from hardcoded FAQs")
    faq: FAQMatch | None = None
    conversation_id: str | None = None
    suggested_actions: list[str] = Field(default_factory=list)
