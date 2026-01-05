-- ========================================
-- COMBINED SCHEMA MIGRATION FOR SUPABASE CLOUD
-- ========================================
-- Este archivo combina todas las migraciones en un solo script SQL
-- para ejecutar directamente en el SQL Editor de Supabase Cloud
-- ========================================

-- ========================================
-- PART 0: FIX AUTH SCHEMA MISMATCH (COMPLETE)
-- ========================================
-- Fix for potential mismatch between Postgres image schema and GoTrue version
-- This recreation ensures all modern Auth tables exist.

DO $$
BEGIN
  -- 1. Ensure required ENUMs exist
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'aal_level') THEN
      CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'factor_type') THEN
      CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'factor_status') THEN
      CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');
  END IF;

  -- 2. Add missing columns to auth.users
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'deleted_at') THEN
    ALTER TABLE auth.users ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_anonymous') THEN
    ALTER TABLE auth.users ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE NOT NULL;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE auth.users ADD COLUMN phone TEXT DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone_confirmed_at') THEN
    ALTER TABLE auth.users ADD COLUMN phone_confirmed_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone_change') THEN
    ALTER TABLE auth.users ADD COLUMN phone_change TEXT DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone_change_token') THEN
    ALTER TABLE auth.users ADD COLUMN phone_change_token VARCHAR(255) DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone_change_sent_at') THEN
    ALTER TABLE auth.users ADD COLUMN phone_change_sent_at TIMESTAMPTZ DEFAULT NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change_token_current') THEN
    ALTER TABLE auth.users ADD COLUMN email_change_token_current VARCHAR(255) DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'email_change_confirm_status') THEN
    ALTER TABLE auth.users ADD COLUMN email_change_confirm_status SMALLINT DEFAULT 0 CHECK (email_change_confirm_status >= 0 AND email_change_confirm_status <= 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'banned_until') THEN
    ALTER TABLE auth.users ADD COLUMN banned_until TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'reauthentication_token') THEN
    ALTER TABLE auth.users ADD COLUMN reauthentication_token VARCHAR(255) DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_sso_user') THEN
    ALTER TABLE auth.users ADD COLUMN is_sso_user BOOLEAN DEFAULT FALSE NOT NULL;
  END IF;

END $$;

-- 3. Create missing tables (Identities, Sessions, MFA)
CREATE TABLE IF NOT EXISTS auth.identities (
    id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamptz,
    created_at timestamptz,
    updated_at timestamptz,
    email text GENERATED ALWAYS AS (lower(identity_data->>'email')) STORED,
    CONSTRAINT identities_pkey PRIMARY KEY (provider, id),
    CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS identities_user_id_idx ON auth.identities(user_id);
CREATE INDEX IF NOT EXISTS identities_email_idx ON auth.identities (email text_pattern_ops);

CREATE TABLE IF NOT EXISTS auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamptz,
    updated_at timestamptz,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamptz,
    refreshed_at timestamptz,
    user_agent text,
    ip text,
    tag text,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON auth.sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_not_after_idx ON auth.sessions(not_after);

CREATE TABLE IF NOT EXISTS auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamptz,
    updated_at timestamptz,
    secret text,
    CONSTRAINT mfa_factors_pkey PRIMARY KEY (id),
    CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS mfa_factors_user_id_idx ON auth.mfa_factors(user_id);

CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamptz NOT NULL,
    verified_at timestamptz,
    ip_address inet NOT NULL,
    CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id),
    CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL,
    CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE,
    CONSTRAINT mfa_amr_claims_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX IF NOT EXISTS mfa_amr_claims_session_id_authentication_method_pkey ON auth.mfa_amr_claims(session_id, authentication_method);

CREATE TABLE IF NOT EXISTS auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamptz,
    updated_at timestamptz,
    authentication_method text NOT NULL,
    CONSTRAINT flow_state_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS flow_state_created_at_idx ON auth.flow_state(created_at DESC);

-- Ensure grants for Auth service and Dashboard
GRANT ALL ON TABLE auth.identities TO postgres, supabase_auth_admin, dashboard_user, service_role;
GRANT ALL ON TABLE auth.sessions TO postgres, supabase_auth_admin, dashboard_user, service_role;
GRANT ALL ON TABLE auth.mfa_factors TO postgres, supabase_auth_admin, dashboard_user, service_role;
GRANT ALL ON TABLE auth.mfa_challenges TO postgres, supabase_auth_admin, dashboard_user, service_role;
GRANT ALL ON TABLE auth.mfa_amr_claims TO postgres, supabase_auth_admin, dashboard_user, service_role;
GRANT ALL ON TABLE auth.flow_state TO postgres, supabase_auth_admin, dashboard_user, service_role;

-- Grant usage on schemas just in case
GRANT USAGE ON SCHEMA auth TO supabase_auth_admin, dashboard_user, service_role;
ORDER BY id;

-- ========================================
-- PART 1: INITIAL SCHEMA
-- ========================================

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

-- Trigger para crear profile y etapas default cuando se registra un nuevo usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar perfil del usuario
    INSERT INTO profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    -- Insertar columnas Kanban por defecto para Ventas
    INSERT INTO columnas_kanban (user_id, tipo, nombre, posicion, color) VALUES
    (NEW.id, 'ventas', 'Por Contactar', 0, '#94a3b8'),
    (NEW.id, 'ventas', 'En Conversación', 1, '#3b82f6'),
    (NEW.id, 'ventas', 'Propuesta Enviada', 2, '#f59e0b'),
    (NEW.id, 'ventas', 'Ganado', 3, '#22c55e');
    
    -- Insertar columnas Kanban por defecto para Postventa/Operaciones
    INSERT INTO columnas_kanban (user_id, tipo, nombre, posicion, color) VALUES
    (NEW.id, 'postventa', 'Onboarding', 0, '#8b5cf6'),
    (NEW.id, 'postventa', 'En Proceso', 1, '#3b82f6'),
    (NEW.id, 'postventa', 'Por Facturar', 2, '#f59e0b'),
    (NEW.id, 'postventa', 'Completado', 3, '#22c55e');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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
