-- Migración 002: Completar esquema de base de datos para CONTAFLOW
-- Este archivo crea las tablas faltantes y configura RLS completo

-- 1. Tabla profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla tasks
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

-- 3. Tabla custom_field_definitions
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

-- 4. Habilitar Row Level Security en todas las tablas
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas ENABLE ROW LEVEL SECURITY;
ALTER TABLE columnas_kanban ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de RLS
CREATE POLICY "Users own profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own fichas" ON fichas FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own columns" ON columnas_kanban FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own timeline" ON timeline FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own fields" ON custom_field_definitions FOR ALL USING (auth.uid() = user_id);

-- 6. Trigger para crear profile y etapas default cuando se registra un nuevo usuario
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

-- 7. Crear trigger si no existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ficha_id ON tasks(ficha_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_custom_fields_user_id ON custom_field_definitions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- 9. Añadir columna custom_values a fichas para campos personalizados
ALTER TABLE fichas ADD COLUMN IF NOT EXISTS custom_values JSONB DEFAULT '{}';

-- 10. Función para actualizar timestamp de profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Trigger para actualizar updated_at en profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
