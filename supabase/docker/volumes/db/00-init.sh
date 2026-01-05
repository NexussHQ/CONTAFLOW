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
  END
  \$\$;

  GRANT anon TO postgres;
  GRANT authenticated TO postgres;
  GRANT service_role TO postgres;
  GRANT supabase_admin TO postgres;
  GRANT supabase_auth_admin TO postgres;
  GRANT supabase_storage_admin TO postgres;
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
  
  -- Grant permissions to auth admin
  GRANT ALL PRIVILEGES ON SCHEMA auth TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO supabase_auth_admin;
  GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA auth TO supabase_auth_admin;
EOSQL

echo "Database Initialization Completed Successfully."
