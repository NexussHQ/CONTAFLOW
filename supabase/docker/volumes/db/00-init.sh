#!/bin/bash
set -e

echo "Starting Supabase Database Initialization..."

# 1. Initialize Roles
echo "Creating Roles..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  DO \$\$
  BEGIN
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

# 2. Initialize Auth Schema (Defense against missing migrations)
echo "Creating Auth Schema and Users Table..."
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE SCHEMA IF NOT EXISTS auth;
  
  -- Create auth.users table if it doesn't exist
  CREATE TABLE IF NOT EXISTS auth.users (
      instance_id uuid,
      id uuid NOT NULL PRIMARY KEY,
      aud character varying(255),
      role character varying(255),
      email character varying(255),
      encrypted_password character varying(255),
      email_confirmed_at timestamp with time zone,
      invited_at timestamp with time zone,
      confirmation_token character varying(255),
      confirmation_sent_at timestamp with time zone,
      recovery_token character varying(255),
      recovery_sent_at timestamp with time zone,
      email_change_token_new character varying(255),
      email_change character varying(255),
      email_change_sent_at timestamp with time zone,
      last_sign_in_at timestamp with time zone,
      raw_app_meta_data jsonb,
      raw_user_meta_data jsonb,
      is_super_admin boolean,
      created_at timestamp with time zone,
      updated_at timestamp with time zone,
      phone character varying(255),
      phone_confirmed_at timestamp with time zone,
      phone_change character varying(255),
      phone_change_token character varying(255),
      phone_change_sent_at timestamp with time zone,
      confirmed_at timestamp with time zone,
      email_change_token_current character varying(255),
      email_change_confirm_status smallint DEFAULT 0,
      banned_until timestamp with time zone,
      reauthentication_token character varying(255) DEFAULT ''::character varying,
      reauthentication_sent_at timestamp with time zone,
      is_sso_user boolean DEFAULT false NOT NULL,
      deleted_at timestamp with time zone,
      is_anonymous boolean DEFAULT false NOT NULL
  );
  
  CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users (email);

  -- Create auth.identities table
  CREATE TABLE IF NOT EXISTS auth.identities (
      id text NOT NULL,
      user_id uuid NOT NULL,
      identity_data jsonb NOT NULL,
      provider text NOT NULL,
      last_sign_in_at timestamp with time zone,
      created_at timestamp with time zone,
      updated_at timestamp with time zone,
      email text GENERATED ALWAYS AS (lower(identity_data->>'email')) STORED,
      CONSTRAINT identities_pkey PRIMARY KEY (provider, id),
      CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS identities_user_id_idx ON auth.identities (user_id);
  CREATE INDEX IF NOT EXISTS identities_email_idx ON auth.identities (email text_pattern_ops);

  -- Create auth.sessions table
  CREATE TABLE IF NOT EXISTS auth.sessions (
      id uuid NOT NULL PRIMARY KEY,
      user_id uuid NOT NULL,
      created_at timestamp with time zone,
      updated_at timestamp with time zone,
      factor_id uuid,
      aal text,
      not_after timestamp with time zone,
      CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON auth.sessions (user_id);
  CREATE INDEX IF NOT EXISTS sessions_not_after_idx ON auth.sessions (not_after);

  -- Create auth.refresh_tokens table
  CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
      instance_id uuid,
      id bigserial PRIMARY KEY,
      token character varying(255),
      user_id character varying(255),
      revoked boolean,
      created_at timestamp with time zone,
      updated_at timestamp with time zone,
      parent character varying(255),
      session_id uuid,
      CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON auth.refresh_tokens (token);
  CREATE INDEX IF NOT EXISTS refresh_tokens_session_id_idx ON auth.refresh_tokens (session_id);
  CREATE INDEX IF NOT EXISTS refresh_tokens_parent_idx ON auth.refresh_tokens (parent);

  -- Create auth.audit_log_entries table
  CREATE TABLE IF NOT EXISTS auth.audit_log_entries (
      instance_id uuid,
      id uuid NOT NULL PRIMARY KEY,
      payload jsonb,
      created_at timestamp with time zone,
      ip_address character varying(64) DEFAULT ''::character varying NOT NULL
  );
  CREATE INDEX IF NOT EXISTS audit_logs_instance_id_idx ON auth.audit_log_entries (instance_id);

  -- Create auth.schema_migrations table (required by GoTrue)
  CREATE TABLE IF NOT EXISTS auth.schema_migrations (
      version character varying(255) NOT NULL PRIMARY KEY
  );

  -- Grant permissions to auth admin
  GRANT ALL PRIVILEGES ON SCHEMA auth TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA auth TO supabase_auth_admin;

  -- FIX: Grant permissions to other admin roles (Studio/API access)
  GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
  GRANT ALL PRIVILEGES ON SCHEMA auth TO supabase_admin, postgres, service_role;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_admin, postgres, service_role;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_admin, postgres, service_role;
  GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA auth TO supabase_admin, postgres, service_role;

  -- CRITICAL: Set ownership of ALL auth objects to supabase_auth_admin so GoTrue can modify them
  ALTER SCHEMA auth OWNER TO supabase_auth_admin;
  ALTER TABLE auth.users OWNER TO supabase_auth_admin;
  ALTER TABLE auth.identities OWNER TO supabase_auth_admin;
  ALTER TABLE auth.sessions OWNER TO supabase_auth_admin;
  ALTER TABLE auth.refresh_tokens OWNER TO supabase_auth_admin;
  ALTER TABLE auth.audit_log_entries OWNER TO supabase_auth_admin;
  ALTER TABLE auth.schema_migrations OWNER TO supabase_auth_admin;
  
  -- Also transfer sequence ownership for refresh_tokens
  ALTER SEQUENCE auth.refresh_tokens_id_seq OWNER TO supabase_auth_admin;
EOSQL

echo "Database Initialization Completed Successfully."
