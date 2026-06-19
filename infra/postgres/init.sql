-- Non-superuser application role (subject to RLS; used by app in prod + tests)
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'dcos_app') THEN
    CREATE ROLE dcos_app WITH LOGIN PASSWORD 'dcos_app'
      NOSUPERUSER NOINHERIT NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;

GRANT CONNECT ON DATABASE dcos TO dcos_app;
GRANT USAGE ON SCHEMA public TO dcos_app;
-- Tables are created by Alembic migrations (run after init), so grant via
-- ALTER DEFAULT PRIVILEGES so future tables are automatically accessible.
ALTER DEFAULT PRIVILEGES FOR ROLE dcos IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO dcos_app;
ALTER DEFAULT PRIVILEGES FOR ROLE dcos IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO dcos_app;

-- Extensions — all enabled at startup so migrations can assume they exist
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS btree_gin;
