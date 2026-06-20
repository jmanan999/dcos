from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENVIRONMENT: Literal["local", "staging", "production"] = "local"
    APP_NAME: str = "DCOS API"
    API_VERSION: str = "v1"

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://dcos:dcos@localhost:5432/dcos"
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_ECHO: bool = False

    # ── Redis ─────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ── Supabase ─────────────────────────────────────────────────────────────
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""

    # ── JWT ──────────────────────────────────────────────────────────────────
    JWT_SECRET: str = "change-me-in-production-use-a-256-bit-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24h

    # ── Object storage (MinIO / S3 / R2) ────────────────────────────────────
    STORAGE_ENDPOINT: str = "http://localhost:9000"
    STORAGE_ACCESS_KEY: str = "minioadmin"
    STORAGE_SECRET_KEY: str = "minioadmin"
    STORAGE_BUCKET_MEDIA: str = "dcos-media"
    STORAGE_REGION: str = "ap-south-1"

    # ── AI provider (groq | openrouter | gemini) ─────────────────────────────
    AI_PROVIDER: str = "groq"

    # Groq — LPU hardware, 14,400 req/day free, OpenAI-compatible
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1"

    # Gemini (fallback)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL_DEFAULT: str = "gemini-2.5-flash"
    GEMINI_MODEL_PRO: str = "gemini-2.5-pro"

    # OpenRouter (fallback, OpenAI-compatible)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "deepseek/deepseek-chat-v3-0324"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"

    # ── WhatsApp Cloud API ───────────────────────────────────────────────────
    WHATSAPP_TOKEN: str = ""
    WHATSAPP_PHONE_NUMBER_ID: str = ""
    WHATSAPP_VERIFY_TOKEN: str = "dcos-whatsapp-verify"
    WHATSAPP_API_VERSION: str = "v20.0"

    # ── SMS (MSG91) ──────────────────────────────────────────────────────────
    MSG91_API_KEY: str = ""
    MSG91_SENDER_ID: str = "DCOSGOV"
    MSG91_TEMPLATE_ID_STATUS: str = ""

    # ── Notifications ─────────────────────────────────────────────────────────
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_SUBJECT: str = "mailto:admin@dcos.delhi.gov.in"

    # ── Observability ────────────────────────────────────────────────────────
    SENTRY_DSN: str = ""
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""
    OTEL_SERVICE_NAME: str = "dcos-api"

    # ── Security ─────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    RATE_LIMIT_INTAKE_PER_MINUTE: int = 30
    RATE_LIMIT_API_PER_MINUTE: int = 200

    # ── Feature flags ─────────────────────────────────────────────────────────
    FEATURE_AI_CLASSIFY: bool = True
    FEATURE_WHATSAPP_INTAKE: bool = False
    FEATURE_ANALYTICS_NL_QUERY: bool = False
    FEATURE_CHATBOT: bool = True

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v


settings = Settings()
