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

  -- Pre-populate schema_migrations to prevent GoTrue from re-running migrations
  -- This tells GoTrue: "These migrations are already applied manually"
  INSERT INTO auth.schema_migrations (version) VALUES
    ('00'),
    ('20210710035447'),
    ('20210722035447'),
    ('20210730183235'),
    ('20210909172000'),
    ('20210927181326'),
    ('20211122151130'),
    ('20211124214934'),
    ('20211202183645'),
    ('20220114185221'),
    ('20220114185340'),
    ('20220224000811'),
    ('20220323170000'),
    ('20220429102000'),
    ('20220531120530'),
    ('20220614074223'),
    ('20220811173540'),
    ('20221003041349'),
    ('20221003041400'),
    ('20221011041400'),
    ('20221020193600'),
    ('20221021073300'),
    ('20221021082433'),
    ('20221027105023'),
    ('20221114143122'),
    ('20221114143410'),
    ('20221125140132'),
    ('20221208132122'),
    ('20221215195500'),
    ('20221215195800'),
    ('20221215195900'),
    ('20230116124310'),
    ('20230116124412'),
    ('20230131181311'),
    ('20230322519590'),
    ('20230402418590'),
    ('20230411005111'),
    ('20230508135423'),
    ('20230523124323'),
    ('20230818113222'),
    ('20230914180801'),
    ('20231027141322'),
    ('20231114161723'),
    ('20231117164230'),
    ('20240115144230'),
    ('20240214120130'),
    ('20240306115329'),
    ('20240314092811'),
    ('20240427152123'),
    ('20240612123726'),
    ('20240729123726'),
    ('20240802193726'),
    ('20240806073726'),
    ('20241009103726'),
    ('20250717082212'),
    ('20250731150234'),
    ('20250804100000'),
    ('20250901200500'),
    ('20250903112500'),
    ('20250904133000'),
    ('20250925093508'),
    ('20251007112900'),
    ('20251104100000'),
    ('20251111201300')
  ON CONFLICT DO NOTHING;

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
  
  -- CRITICAL: Create auth.uid() and auth.role() functions for RLS policies
  -- These functions read JWT claims set by PostgREST at runtime
  CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS \$\$
    SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
  \$\$ LANGUAGE sql STABLE;
  
  CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS \$\$
    SELECT NULLIF(current_setting('request.jwt.claim.role', true), '');
  \$\$ LANGUAGE sql STABLE;
  
  -- Grant execute permissions on these functions
  GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
  GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
  
  -- CRITICAL FIX: Transfer ownership to supabase_auth_admin so GoTrue can replace these functions during migrations
  ALTER FUNCTION auth.uid() OWNER TO supabase_auth_admin;
  ALTER FUNCTION auth.role() OWNER TO supabase_auth_admin;
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

echo "Running Application Schema from merged schema.sql..."
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-"EOSQL"
-- Tabla: fichas (Ficha Maestra)
CREATE TABLE fichas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'prospecto' CHECK (tipo IN ('prospecto', 'cliente')),
  nombre VARCHAR(200) NOT NULL,
  ruc VARCHAR(13),
  telefono VARCHAR(20),
  email VARCHAR(255),
  relacion VARCHAR(20) DEFAULT 'lead' CHECK (relacion IN ('lead', 'cliente', 'socio', 'colega')),
  campos_personalizados JSONB DEFAULT '{}',
  etapa_ventas VARCHAR(50),
  etapa_postventa VARCHAR(50),
  creado_at TIMESTAMPTZ DEFAULT NOW(),
  actualizado_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: columnas_kanban (Configuración columnas por usuario)
CREATE TABLE columnas_kanban (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ventas', 'postventa')),
  nombre VARCHAR(100) NOT NULL,
  posicion INTEGER NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1'
);

-- Tabla: timeline (Historial unificado)
CREATE TABLE timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID NOT NULL,
  user_id UUID NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('nota', 'llamada', 'email', 'reunion', 'tarea', 'sistema')),
  titulo VARCHAR(200),
  contenido TEXT,
  fecha TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: etiquetas_ficha
CREATE TABLE etiquetas_ficha (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  nombre VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL
);

-- Tabla: ficha_etiquetas (Muchos a muchos)
CREATE TABLE ficha_etiquetas (
  ficha_id UUID NOT NULL,
  etiqueta_id UUID NOT NULL,
  PRIMARY KEY (ficha_id, etiqueta_id)
);

-- Índices para tablas iniciales
CREATE INDEX idx_fichas_user ON fichas(user_id);
CREATE INDEX idx_fichas_tipo ON fichas(tipo);
CREATE INDEX idx_timeline_ficha ON timeline(ficha_id);
CREATE INDEX idx_timeline_fecha ON timeline(fecha DESC);
CREATE INDEX idx_columnas_kanban_user ON columnas_kanban(user_id);
CREATE INDEX idx_columnas_kanban_tipo ON columnas_kanban(tipo);
CREATE INDEX idx_etiquetas_ficha_user ON etiquetas_ficha(user_id);

-- Función para actualizar actualizado_at
CREATE OR REPLACE FUNCTION update_actualizado_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para fichas
CREATE TRIGGER update_fichas_actualizado_at
  BEFORE UPDATE ON fichas
  FOR EACH ROW
  EXECUTE FUNCTION update_actualizado_at();

-- ========================================
-- PART 2: COMPLETE SCHEMA
-- ========================================

-- Tabla: profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: tasks
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    ficha_id UUID REFERENCES fichas(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    priority VARCHAR(10) DEFAULT 'normal' CHECK (priority IN ('high', 'normal')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    due_date DATE,
    due_time TIME,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Tabla: custom_field_definitions
CREATE TABLE IF NOT EXISTS custom_field_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    field_key TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL CHECK (field_type IN ('text', 'date', 'number', 'select')),
    options JSONB,
    is_required BOOLEAN DEFAULT FALSE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, field_key)
);

-- Añadir columna custom_values a fichas
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS custom_values JSONB DEFAULT '{}';

-- Habilitar Row Level Security en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE columnas_kanban ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE etiquetas_ficha ENABLE ROW LEVEL SECURITY;
ALTER TABLE ficha_etiquetas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Users own profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own fichas" ON fichas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own columns" ON columnas_kanban FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own timeline" ON timeline FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own fields" ON custom_field_definitions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own etiquetas_ficha" ON etiquetas_ficha FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read ficha_etiquetas" ON ficha_etiquetas FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM fichas
    WHERE fichas.id = ficha_etiquetas.ficha_id
    AND fichas.user_id = auth.uid()
  )
);

-- ========================================
-- PART 3: MIGRATION 004 (FIX REGISTRATION & PROFILES)
-- ========================================

-- 1. Eliminar políticas existentes si existen (Cleanup)
DROP POLICY IF EXISTS "Enable insert for authenticated users via function" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users via function" ON columnas_kanban;
DROP POLICY IF EXISTS "Habilitar inserción para usuarios autenticados mediante función" ON profiles;
DROP POLICY IF EXISTS "Habilitar inserción para usuarios autenticados mediante función" ON columnas_kanban;

-- 2. Crear función para insertar perfil con SECURITY DEFINER
CREATE OR REPLACE FUNCTION insert_user_profile(
    p_user_id UUID,
    p_nombre TEXT DEFAULT NULL,
    p_full_name TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Intentar insertar con nombre y apellido
    BEGIN
        INSERT INTO profiles (id, nombre, apellido)
        VALUES (p_user_id, p_nombre, '')
        ON CONFLICT (id) DO NOTHING;
    EXCEPTION
        WHEN undefined_column THEN
            -- Si falla porque la tabla tiene full_name en lugar de nombre/apellido
            INSERT INTO profiles (id, full_name)
            VALUES (p_user_id, COALESCE(p_full_name, p_nombre))
            ON CONFLICT (id) DO NOTHING;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Crear función para insertar columnas Kanban con SECURITY DEFINER
CREATE OR REPLACE FUNCTION insert_default_kanban_columns(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Insertar columnas Kanban por defecto para Ventas
    INSERT INTO columnas_kanban (usuario_id, tipo, nombre, posicion, color) VALUES
    (p_user_id, 'ventas', 'Por Contactar', 0, '#94a3b8'),
    (p_user_id, 'ventas', 'En Conversación', 1, '#3b82f6'),
    (p_user_id, 'ventas', 'Propuesta Enviada', 2, '#f59e0b'),
    (p_user_id, 'ventas', 'Ganado', 3, '#22c55e')
    ON CONFLICT DO NOTHING;

    -- Insertar columnas Kanban por defecto para Postventa/Operaciones
    INSERT INTO columnas_kanban (usuario_id, tipo, nombre, posicion, color) VALUES
    (p_user_id, 'postventa', 'Onboarding', 0, '#8b5cf6'),
    (p_user_id, 'postventa', 'En Proceso', 1, '#3b82f6'),
    (p_user_id, 'postventa', 'Por Facturar', 2, '#f59e0b'),
    (p_user_id, 'postventa', 'Completado', 3, '#22c55e')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Crear función combinada para registrar usuario completo
CREATE OR REPLACE FUNCTION complete_user_registration(
    p_user_id UUID,
    p_nombre TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insertar el perfil
    PERFORM insert_user_profile(p_user_id, p_nombre);

    -- Insertar las columnas Kanban por defecto
    PERFORM insert_default_kanban_columns(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Crear función RPC que puede ser llamada desde el cliente
CREATE OR REPLACE FUNCTION create_user_profile_and_columns(
    p_user_id UUID,
    p_nombre TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    -- Verificar que el usuario existe en auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
        RAISE EXCEPTION 'Usuario no encontrado en auth.users';
    END IF;

    -- Insertar el perfil
    PERFORM insert_user_profile(p_user_id, p_nombre);

    -- Insertar las columnas Kanban por defecto
    PERFORM insert_default_kanban_columns(p_user_id);

    -- Retornar éxito
    v_result := jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'message', 'Perfil y columnas Kanban creados exitosamente'
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Otorgar permisos de ejecución a las funciones para los usuarios autenticados
GRANT EXECUTE ON FUNCTION insert_user_profile(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION insert_default_kanban_columns(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_user_registration(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_profile_and_columns(UUID, TEXT) TO authenticated;

-- 7. Modificar el trigger existente para usar las nuevas funciones
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Usar la nueva función para crear el perfil y las columnas
    PERFORM complete_user_registration(
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'nombre',
            NEW.raw_user_meta_data->>'full_name'
        )
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Añadir política para permitir INSERT en profiles mediante la función
CREATE POLICY "Enable insert for authenticated users via function" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 9. Añadir política para permitir INSERT en columnas_kanban mediante la función
CREATE POLICY "Enable insert for authenticated users via function" ON columnas_kanban
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 10. Comentario explicativo
COMMENT ON FUNCTION create_user_profile_and_columns(UUID, TEXT) IS 'Función segura para crear perfil y columnas Kanban al registrar usuario. Puede ser llamada desde el cliente incluso si el usuario no está confirmado. Usa SECURITY DEFINER para evitar restricciones de RLS.';

-- ========================================
-- PART 4: MIGRATION 005 (SUBTASKS)
-- ========================================

-- 1. Crear tabla de subtareas
CREATE TABLE IF NOT EXISTS subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 2. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_subtasks_task_id ON subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_completed ON subtasks(completed);

-- 3. Habilitar Row Level Security en la tabla subtasks
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

-- 4. Política de RLS para subtareas
CREATE POLICY "Users can view subtasks" ON subtasks
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = subtasks.task_id
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create subtasks" ON subtasks
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = subtasks.task_id
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update subtasks" ON subtasks
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = subtasks.task_id
            AND tasks.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete subtasks" ON subtasks
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM tasks
            WHERE tasks.id = subtasks.task_id
            AND tasks.user_id = auth.uid()
        )
    );

-- 5. Función para verificar si todas las subtareas de una tarea están completadas
CREATE OR REPLACE FUNCTION check_subtasks_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actualizar la tarea si hay subtareas
    IF EXISTS (SELECT 1 FROM subtasks WHERE task_id = NEW.task_id OR task_id = OLD.task_id) THEN
        -- Verificar si todas las subtareas están completadas
        DECLARE
            all_completed BOOLEAN;
            task_id_to_check UUID;
        BEGIN
            -- Determinar qué task_id verificar (usar NEW si existe, sino OLD)
            task_id_to_check := COALESCE(NEW.task_id, OLD.task_id);

            -- Verificar si todas las subtareas están completadas
            SELECT COUNT(*) = 0 INTO all_completed
            FROM subtasks
            WHERE task_id = task_id_to_check
            AND completed = FALSE;

            -- Si todas las subtareas están completadas, marcar la tarea como completada
            IF all_completed THEN
                UPDATE tasks
                SET status = 'completed',
                    completed_at = NOW()
                WHERE id = task_id_to_check
                AND status = 'pending'; -- Solo actualizar si aún está pendiente

            -- Si hay subtareas pendientes, marcar la tarea como pendiente
            ELSIF NOT all_completed AND NEW.completed = TRUE THEN
                UPDATE tasks
                SET status = 'pending',
                    completed_at = NULL
                WHERE id = task_id_to_check
                AND status = 'completed'; -- Solo actualizar si estaba completada
            END IF;
        END;
    END IF;

    -- Para INSERT y UPDATE, retornar NEW
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        RETURN NEW;
    -- Para DELETE, retornar OLD
    ELSIF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Crear triggers para la función de verificación de subtareas
-- Trigger cuando se inserta una subtarea
DROP TRIGGER IF EXISTS on_subtask_inserted ON subtasks;
CREATE TRIGGER on_subtask_inserted
    AFTER INSERT ON subtasks
    FOR EACH ROW
    EXECUTE FUNCTION check_subtasks_completion();

-- Trigger cuando se actualiza una subtarea
DROP TRIGGER IF EXISTS on_subtask_updated ON subtasks;
CREATE TRIGGER on_subtask_updated
    AFTER UPDATE ON subtasks
    FOR EACH ROW
    EXECUTE FUNCTION check_subtasks_completion();

-- Trigger cuando se elimina una subtarea
DROP TRIGGER IF EXISTS on_subtask_deleted ON subtasks;
CREATE TRIGGER on_subtask_deleted
    AFTER DELETE ON subtasks
    FOR EACH ROW
    EXECUTE FUNCTION check_subtasks_completion();

-- 7. Comentario explicativo
COMMENT ON TABLE subtasks IS 'Tabla de subtareas para el sistema de tareas.';

-- Índices adicionales para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ficha_id ON tasks(ficha_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_custom_fields_user_id ON custom_field_definitions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Función para actualizar timestamp de profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- COMPLETION MESSAGE
-- ========================================
-- Schema creation completed successfully!
-- The following tables have been created:
-- - profiles
-- - fichas
-- - tasks
-- - timeline
-- - columnas_kanban
-- - custom_field_definitions
-- - etiquetas_ficha
-- - ficha_etiquetas
--
-- All tables have RLS enabled with proper policies.
-- New users will automatically get:
-- - A profile entry
-- - Default Kanban columns for ventas (4 columns)
-- - Default Kanban columns for postventa (4 columns)

EOSQL
