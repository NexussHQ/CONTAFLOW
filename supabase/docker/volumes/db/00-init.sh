#!/bin/bash
set -e

echo "Starting Supabase Database Initialization..."

# 1. Initialize Roles
echo "Creating Roles..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
    -- Ensure postgres has SUPERUSER privileges to run CREATE EXTENSION and hooks
    ALTER ROLE postgres WITH SUPERUSER;

    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
      CREATE ROLE anon NOLOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
      CREATE ROLE authenticated NOLOGIN NOINHERIT;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
      CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
      CREATE ROLE supabase_admin LOGIN CREATEROLE CREATEDB REPLICATION BYPASSRLS PASSWORD '$POSTGRES_PASSWORD';
    ELSE
      ALTER ROLE supabase_admin WITH PASSWORD '$POSTGRES_PASSWORD';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_auth_admin') THEN
      CREATE ROLE supabase_auth_admin NOINHERIT LOGIN CREATEROLE CREATEDB BYPASSRLS PASSWORD '$POSTGRES_PASSWORD';
    ELSE
      ALTER ROLE supabase_auth_admin WITH PASSWORD '$POSTGRES_PASSWORD';
    END IF;
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_storage_admin') THEN
      CREATE ROLE supabase_storage_admin NOINHERIT LOGIN CREATEROLE CREATEDB BYPASSRLS PASSWORD '$POSTGRES_PASSWORD';
    ELSE
      ALTER ROLE supabase_storage_admin WITH PASSWORD '$POSTGRES_PASSWORD';
    END IF;
    
    -- CRITICAL: authenticator role for PostgREST
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticator') THEN
      CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD '$POSTGRES_PASSWORD';
    ELSE
      ALTER ROLE authenticator WITH PASSWORD '$POSTGRES_PASSWORD';
    END IF;
  END
  \$\$;

  -- Grant roles to postgres
  GRANT anon TO postgres;
  GRANT authenticated TO postgres;
  GRANT service_role TO postgres;
  GRANT supabase_admin TO postgres;
  GRANT supabase_auth_admin TO postgres;
  GRANT supabase_storage_admin TO postgres;
  
  -- Grant roles to authenticator (PostgREST requires this to switch roles)
  GRANT anon TO authenticator;
  GRANT authenticated TO authenticator;
  GRANT service_role TO authenticator;
  GRANT supabase_admin TO authenticator;
  
  -- CRITICAL: Grant public schema access to auth admin (GoTrue needs this for migrations)
  GRANT ALL PRIVILEGES ON SCHEMA public TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO supabase_auth_admin;
  
  -- Set search_path for auth admin to find both auth and public schemas
  ALTER ROLE supabase_auth_admin SET search_path TO auth, public, extensions;
EOSQL

# 2. Initialize Auth Schema (Empty - Let GoTrue handle migrations)
echo "Creating Auth Schema..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE SCHEMA IF NOT EXISTS auth;

  -- Grant permissions to auth admin so it can create tables
  GRANT ALL PRIVILEGES ON SCHEMA auth TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA auth TO supabase_auth_admin;

  -- Grant permissions to other admin roles (Studio/API access)
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT ALL PRIVILEGES ON SCHEMA auth TO supabase_admin, postgres, service_role;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_admin, postgres, service_role;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_admin, postgres, service_role;
  GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA auth TO supabase_admin, postgres, service_role;

  -- CRITICAL: Set ownership of schema to supabase_auth_admin
  ALTER SCHEMA auth OWNER TO supabase_auth_admin;
  
  -- CRITICAL: Create auth.uid() and auth.role() functions for RLS policies
  -- These functions read JWT claims set by PostgREST at runtime
  -- We create them here because public schema RLS relies on them immediately.
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS \$\$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
  \$\$ LANGUAGE sql STABLE;
  
  CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS \$\$
    SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
  \$\$ LANGUAGE sql STABLE;
  
  -- Grant execute permissions on these functions
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
EOSQL

# 3. Grant supabase_admin access to public schema (for Studio table creation)
echo "Setting up Studio/Meta permissions for public schema..."
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  -- Grant public schema access to supabase_admin (Studio/Meta needs this for table creation)
  GRANT ALL PRIVILEGES ON SCHEMA public TO supabase_admin;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO supabase_admin;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO supabase_admin;
  GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO supabase_admin;
  
  -- Set default privileges for future objects
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO supabase_admin;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO supabase_admin;
  ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO supabase_admin;
EOSQL

echo "Database Initialization Completed Successfully."
