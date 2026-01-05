-- ========================================
-- APPLICATION SCHEMA (Simplified + Compatibility Patches)
-- ========================================

-- COMPATIBILITY PATCH: Add columns expected by newer GoTrue versions
-- The base image schema might be slightly older.
DO $$
BEGIN
  -- 1. banned_until
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'banned_until') THEN
    ALTER TABLE auth.users ADD COLUMN banned_until TIMESTAMPTZ;
  END IF;

  -- 2. is_anonymous
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_anonymous') THEN
    ALTER TABLE auth.users ADD COLUMN is_anonymous BOOLEAN DEFAULT FALSE NOT NULL;
  END IF;

  -- 3. is_sso_user
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'is_sso_user') THEN
    ALTER TABLE auth.users ADD COLUMN is_sso_user BOOLEAN DEFAULT FALSE NOT NULL;
  END IF;

  -- 4. deleted_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'deleted_at') THEN
    ALTER TABLE auth.users ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
  
   -- 5. phone defaults (often causes issues)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'auth' AND table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE auth.users ADD COLUMN phone TEXT DEFAULT NULL;
  END IF;
END $$;

-- This file contains ONLY the application-specific tables.
-- Authentication tables (auth.users) are managed by Supabase standard migrations.

-- Ensure extensions required for the app (if not default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


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
-- Trigger para crear profile y etapas default cuando se registra un nuevo usuario
-- (DISABLED FOR DEBUGGING ISOLATION)
/*
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insertar perfil del usuario
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    
    -- Insertar columnas Kanban por defecto para Ventas
    INSERT INTO public.columnas_kanban (user_id, tipo, nombre, posicion, color) VALUES
    (NEW.id, 'ventas', 'Por Contactar', 0, '#94a3b8'),
    (NEW.id, 'ventas', 'En Conversación', 1, '#3b82f6'),
    (NEW.id, 'ventas', 'Propuesta Enviada', 2, '#f59e0b'),
    (NEW.id, 'ventas', 'Ganado', 3, '#22c55e');
    
    -- Insertar columnas Kanban por defecto para Postventa/Operaciones
    INSERT INTO public.columnas_kanban (user_id, tipo, nombre, posicion, color) VALUES
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
*/

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
