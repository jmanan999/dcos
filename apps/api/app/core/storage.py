"""
Object storage helper — wraps boto3/S3 for MinIO (local) and S3/R2 (production).
All media goes through here; the rest of the codebase only sees URLs.
"""
from __future__ import annotations

import structlog

from app.core.config import settings

log = structlog.get_logger()


def _client():
    import boto3
    return boto3.client(
        "s3",
        endpoint_url=settings.STORAGE_ENDPOINT,
        aws_access_key_id=settings.STORAGE_ACCESS_KEY,
        aws_secret_access_key=settings.STORAGE_SECRET_KEY,
        region_name=settings.STORAGE_REGION,
    )


async def upload_bytes(key: str, data: bytes, content_type: str) -> str:
    """Upload bytes to the media bucket and return the public URL."""
    import asyncio
    loop = asyncio.get_event_loop()

    def _do_upload() -> None:
        client = _client()
        client.put_object(
            Bucket=settings.STORAGE_BUCKET_MEDIA,
            Key=key,
            Body=data,
            ContentType=content_type,
        )

    await loop.run_in_executor(None, _do_upload)

    # Public URL — in production replace with CDN URL
    url = f"{settings.STORAGE_ENDPOINT}/{settings.STORAGE_BUCKET_MEDIA}/{key}"
    log.info("storage.uploaded", key=key, bytes=len(data))
    return url


async def generate_presigned_url(key: str, expires_seconds: int = 3600) -> str:
    """Generate a time-limited presigned URL for private media."""
    import asyncio
    loop = asyncio.get_event_loop()

    def _do_presign() -> str:
        client = _client()
        return client.generate_presigned_url(
            "get_object",
            Params={"Bucket": settings.STORAGE_BUCKET_MEDIA, "Key": key},
            ExpiresIn=expires_seconds,
        )

    return await loop.run_in_executor(None, _do_presign)
