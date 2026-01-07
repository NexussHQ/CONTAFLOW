-- ========================================
-- APPLICATION SCHEMA (Simplified + Compatibility Patches)
-- ========================================

-- DEFENSIVE: Create auth.users if it doesn't exist (Base image failure fallback)
CREATE SCHEMA IF NOT EXISTS auth;
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
-- Add index for email lookup if creating manually
CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users (email);

-- COMPATIBILITY PATCH: Add columns expected by newer GoTrue versions
-- The base image schema might be slightly older. (Still useful if table existed but was old)
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
