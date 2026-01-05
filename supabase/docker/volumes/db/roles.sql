-- Securely retrieve password from environment
\set password `echo "$POSTGRES_PASSWORD"`

DO $$
BEGIN
  -- 1. anon
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;

  -- 2. authenticated
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;

  -- 3. service_role
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;

  -- 4. supabase_admin
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS;
  END IF;

  -- 5. supabase_auth_admin
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
    CREATE ROLE supabase_auth_admin NOINHERIT LOGIN CREATEROLE CREATEDB BYPASSRLS;
  END IF;

  -- 6. supabase_storage_admin
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
    CREATE ROLE supabase_storage_admin NOINHERIT LOGIN CREATEROLE CREATEDB BYPASSRLS;
  END IF;
END
$$;

-- Set passwords securely
ALTER ROLE supabase_admin WITH PASSWORD :'password';
ALTER ROLE supabase_auth_admin WITH PASSWORD :'password';
ALTER ROLE supabase_storage_admin WITH PASSWORD :'password';

-- Grant permissions to postgres superuser
GRANT anon TO postgres;
GRANT authenticated TO postgres;
GRANT service_role TO postgres;
GRANT supabase_admin TO postgres;
GRANT supabase_auth_admin TO postgres;
GRANT supabase_storage_admin TO postgres;
