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
      provider_id text NOT NULL,
      id text NOT NULL,
      user_id uuid NOT NULL,
      identity_data jsonb NOT NULL,
      provider text NOT NULL,
      last_sign_in_at timestamp with time zone,
      created_at timestamp with time zone,
      updated_at timestamp with time zone,
      email text GENERATED ALWAYS AS (lower(identity_data->>'email')) STORED,
      CONSTRAINT identities_pkey PRIMARY KEY (id),
      CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider),
      CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS identities_user_id_idx ON auth.identities (user_id);
  CREATE INDEX IF NOT EXISTS identities_email_idx ON auth.identities (email text_pattern_ops);

  -- Create auth.sessions table (with all columns expected by GoTrue)
  CREATE TABLE IF NOT EXISTS auth.sessions (
      id uuid NOT NULL PRIMARY KEY,
      user_id uuid NOT NULL,
      created_at timestamp with time zone,
      updated_at timestamp with time zone,
      factor_id uuid,
      aal text,
      not_after timestamp with time zone,
      refreshed_at timestamp without time zone,
      user_agent text,
      ip inet,
      tag text,
      scopes text[],
      oauth_client_id uuid,
      refresh_token_counter bigint DEFAULT 0,
      refresh_token_hmac_key bytea,
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

  -- Create auth.one_time_tokens table (required by GoTrue for email/phone verification)
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'one_time_token_type' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')) THEN
      CREATE TYPE auth.one_time_token_type AS ENUM (
        'confirmation_token',
        'reauthentication_token',
        'recovery_token',
        'email_change_token_new',
        'email_change_token_current',
        'phone_change_token'
      );
    END IF;
  END
  \$\$;

  CREATE TABLE IF NOT EXISTS auth.one_time_tokens (
      id uuid NOT NULL PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      token_type auth.one_time_token_type NOT NULL,
      token_hash text NOT NULL CHECK (length(token_hash) > 0),
      relates_to text NOT NULL,
      created_at timestamp without time zone DEFAULT now() NOT NULL,
      updated_at timestamp without time zone DEFAULT now() NOT NULL
  );
  CREATE INDEX IF NOT EXISTS one_time_tokens_user_id_token_type_idx ON auth.one_time_tokens (user_id, token_type);
  CREATE INDEX IF NOT EXISTS one_time_tokens_relates_to_idx ON auth.one_time_tokens (relates_to);

  -- Create MFA enum types
  DO \$\$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'factor_type' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')) THEN
      CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn', 'phone');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'factor_status' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')) THEN
      CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aal_level' AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')) THEN
      CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');
    END IF;
  END
  \$\$;

  -- Create auth.mfa_factors table (for MFA TOTP/WebAuthn/Phone)
  CREATE TABLE IF NOT EXISTS auth.mfa_factors (
      id uuid NOT NULL PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      friendly_name text,
      factor_type auth.factor_type NOT NULL,
      status auth.factor_status NOT NULL,
      created_at timestamp with time zone NOT NULL,
      updated_at timestamp with time zone NOT NULL,
      secret text,
      phone text,
      last_challenged_at timestamp with time zone,
      last_webauthn_challenge_data jsonb,
      web_authn_credential jsonb,
      web_authn_aaguid uuid
  );
  CREATE INDEX IF NOT EXISTS mfa_factors_user_id_idx ON auth.mfa_factors (user_id);
  CREATE UNIQUE INDEX IF NOT EXISTS mfa_factors_user_friendly_name_unique ON auth.mfa_factors (user_id, friendly_name) WHERE friendly_name IS NOT NULL;

  -- Create auth.mfa_challenges table
  CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
      id uuid NOT NULL PRIMARY KEY,
      factor_id uuid NOT NULL REFERENCES auth.mfa_factors(id) ON DELETE CASCADE,
      created_at timestamp with time zone NOT NULL,
      verified_at timestamp with time zone,
      ip_address inet NOT NULL,
      otp_code text
  );
  CREATE INDEX IF NOT EXISTS mfa_challenges_factor_id_idx ON auth.mfa_challenges (factor_id);

  -- Create auth.mfa_amr_claims table (authentication method reference claims)
  CREATE TABLE IF NOT EXISTS auth.mfa_amr_claims (
      id uuid NOT NULL PRIMARY KEY,
      session_id uuid NOT NULL REFERENCES auth.sessions(id) ON DELETE CASCADE,
      created_at timestamp with time zone NOT NULL,
      updated_at timestamp with time zone NOT NULL,
      authentication_method text NOT NULL,
      CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method)
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

# 3. Grant supabase_admin access to public schema (for Studio table creation)
# This is a non-critical step - if it fails, auth will still work
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
