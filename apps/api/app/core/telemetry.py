import structlog

from app.core.config import settings

log = structlog.get_logger()


def setup_telemetry() -> None:
    _setup_sentry()
    _setup_otel()


def _setup_sentry() -> None:
    if not settings.SENTRY_DSN:
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            integrations=[FastApiIntegration(), SqlalchemyIntegration()],
            traces_sample_rate=0.2 if settings.ENVIRONMENT == "production" else 1.0,
            send_default_pii=False,
        )
        log.info("telemetry.sentry.enabled")
    except ImportError:
        log.warning("telemetry.sentry.skipped", reason="sentry-sdk not installed")


def _setup_otel() -> None:
    if not settings.OTEL_EXPORTER_OTLP_ENDPOINT:
        log.info("telemetry.otel.skipped", reason="OTEL_EXPORTER_OTLP_ENDPOINT not set")
        return
    try:
        from opentelemetry import trace
        from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
        from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
        from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
        from opentelemetry.sdk.resources import Resource
        from opentelemetry.sdk.trace import TracerProvider
        from opentelemetry.sdk.trace.export import BatchSpanProcessor

        resource = Resource(attributes={"service.name": settings.OTEL_SERVICE_NAME})
        provider = TracerProvider(resource=resource)
        provider.add_span_processor(
            BatchSpanProcessor(OTLPSpanExporter(endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT))
        )
        trace.set_tracer_provider(provider)
        FastAPIInstrumentor().instrument()
        SQLAlchemyInstrumentor().instrument()
        log.info("telemetry.otel.enabled", endpoint=settings.OTEL_EXPORTER_OTLP_ENDPOINT)
    except ImportError:
        log.warning("telemetry.otel.skipped", reason="opentelemetry packages not installed")
