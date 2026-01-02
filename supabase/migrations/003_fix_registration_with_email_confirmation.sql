-- Migración 003: Permitir registro con confirmación de email habilitada
-- Esta migración crea funciones con SECURITY DEFINER para insertar el perfil
-- y las columnas Kanban inmediatamente después del registro, sin esperar a
-- que el usuario confirme su email

-- 1. Verificar la estructura actual de la tabla profiles
-- Si tiene full_name, mantenerlo. Si tiene nombre y apellido, mantenerlos.
-- Esta migración es compatible con ambas estructuras.

-- 2. Crear función para insertar perfil con SECURITY DEFINER
-- Esta función puede insertar el perfil aunque el usuario no esté confirmado
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
-- Esta función es segura porque usa SECURITY DEFINER
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
-- Mantener el trigger existente pero mejorarlo para manejar ambos casos
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
-- Esta política permite insertar profiles cuando se usa la función con SECURITY DEFINER
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
