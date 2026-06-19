import time
import uuid

import structlog
from starlette.requests import Request
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
