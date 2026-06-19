# Multi-arch: works on both AMD64 (CI) and ARM64 (Apple Silicon).
# Installs PostGIS 3 + pgvector on top of the official Postgres 16 image.
FROM postgres:16-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
      postgresql-16-postgis-3 \
      postgresql-16-postgis-3-scripts \
      postgresql-16-pgvector \
    && rm -rf /var/lib/apt/lists/*
