# ── Builder ───────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml .
RUN pip install --upgrade pip && pip install --no-cache-dir -e ".[dev]"

# ── Runtime ───────────────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
      libpq5 \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system dcos \
    && adduser --system --ingroup dcos dcos

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY . .

USER dcos

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')"

# Render injects $PORT; fall back to 8000 for local Docker runs.
ENV PORT=8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
