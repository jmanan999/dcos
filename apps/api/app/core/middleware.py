import time
import uuid
from collections import defaultdict

import structlog
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

log = structlog.get_logger()


class RequestIDMiddleware:
    """
    Pure-ASGI middleware (not BaseHTTPMiddleware) that attaches a request ID to
    every request and surfaces it in logs + response headers.

    Using the raw ASGI interface avoids the BaseHTTPMiddleware + asyncpg event-loop
    task-isolation bug (asyncpg futures get attached to the wrong loop when
    BaseHTTPMiddleware wraps call_next in a new task).
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        start = time.perf_counter()

        response_status: int = 0

        async def send_with_headers(message: dict) -> None:
            nonlocal response_status
            if message["type"] == "http.response.start":
                response_status = message["status"]
                headers = list(message.get("headers", []))
                headers.append((b"x-request-id", request_id.encode()))
                duration_ms = round((time.perf_counter() - start) * 1000, 2)
                headers.append((b"x-response-time", f"{duration_ms}ms".encode()))
                message = {**message, "headers": headers}
            await send(message)

        with structlog.contextvars.bound_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        ):
            await self.app(scope, receive, send_with_headers)
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            log.info(
                "http.request",
                status=response_status,
                duration_ms=duration_ms,
            )


class SecurityHeadersMiddleware:
    """
    Adds security headers to every HTTP response.
    Pure-ASGI to stay consistent with RequestIDMiddleware.
    """

    _HEADERS = [
        (b"x-content-type-options", b"nosniff"),
        (b"x-frame-options", b"DENY"),
        (b"x-xss-protection", b"1; mode=block"),
        (b"referrer-policy", b"strict-origin-when-cross-origin"),
        (b"permissions-policy", b"geolocation=(), microphone=(), camera=()"),
    ]

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_security(message: dict) -> None:
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend(self._HEADERS)
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_security)


class RateLimitMiddleware:
    """
    Simple in-process sliding-window rate limiter (per client IP).

    Not suitable for multi-process deployments — use Redis-based limiter there.
    Provides basic protection for local/single-instance use.
    """

    def __init__(self, app: ASGIApp, *, intake_limit: int = 30, global_limit: int = 200) -> None:
        self.app = app
        self._intake_limit = intake_limit
        self._global_limit = global_limit
        # {ip: [(window_start_second, count)]}
        self._counters: dict[str, list] = defaultdict(list)

    def _check(self, ip: str, path: str) -> bool:
        now = int(time.time())
        window = 60
        limit = self._intake_limit if "/intake/grievances" in path and path.endswith("grievances") else self._global_limit

        buckets = self._counters[ip]
        # Remove old buckets outside the window
        self._counters[ip] = [b for b in buckets if now - b[0] < window]
        total = sum(b[1] for b in self._counters[ip])
        if total >= limit:
            return False
        self._counters[ip].append((now, 1))
        return True

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Skip rate limiting in local dev / test environments
        from app.core.config import settings as _settings
        if _settings.ENVIRONMENT == "local":
            await self.app(scope, receive, send)
            return

        request = Request(scope)
        client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown").split(",")[0].strip()

        if not self._check(client_ip, request.url.path):
            log.warning("rate_limit.exceeded", ip=client_ip, path=request.url.path)
            response = JSONResponse(
                {"detail": "Too many requests. Please slow down."},
                status_code=429,
                headers={"Retry-After": "60"},
            )
            await response(scope, receive, send)
            return

        await self.app(scope, receive, send)
