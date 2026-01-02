-- ========================================
-- SQL DE REPARACIÓN SIMPLE PARA USUARIO EXISTENTE
-- ========================================
-- Este script verifica si tienes un perfil y crea uno si no existe
-- NO usa UUIDs literales para evitar errores de sintaxis
-- ========================================

-- Paso 1: Verificar si el usuario tiene un perfil
DO $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Contar usuarios que tienen perfil
    SELECT COUNT(*) INTO user_count
    FROM profiles
    WHERE id IN (SELECT id FROM auth.users);
    
    RAISE NOTICE 'Usuarios en profiles: %', user_count;
    
    -- Si hay usuarios sin perfil, crear perfil
    IF user_count < (SELECT COUNT(*) FROM auth.users) THEN
        INSERT INTO profiles (id, full_name)
        SELECT 
            au.id,
            COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name
        FROM auth.users au
        WHERE au.id NOT IN (SELECT id FROM profiles);
        
        RAISE NOTICE 'Creados % perfiles faltantes', 
            (SELECT COUNT(*) FROM auth.users) - user_count;
    END IF;
END $$ LANGUAGE plpgsql;

-- Paso 2: Verificar si el usuario tiene columnas Kanban
DO $$
DECLARE
    user_without_columns_count INTEGER;
BEGIN
    -- Contar usuarios sin columnas Kanban
    SELECT COUNT(*) INTO user_without_columns_count
    FROM auth.users
    WHERE id NOT IN (SELECT DISTINCT user_id FROM columnas_kanban);
    
    RAISE NOTICE 'Usuarios sin columnas Kanban: %', user_without_columns_count;
    
    -- Crear columnas Kanban para usuarios que no tienen
    IF user_without_columns_count > 0 THEN
        -- Para cada usuario sin columnas, insertar las 8 columnas por defecto
        INSERT INTO columnas_kanban (user_id, tipo, nombre, posicion, color)
        SELECT
            au.id,
            'ventas',
            col.nombre,
            col.posicion,
            col.color
        FROM auth.users au
        CROSS JOIN (VALUES 
            ('Por Contactar', 0, '#94a3b8'),
            ('En Conversación', 1, '#3b82f6'),
            ('Propuesta Enviada', 2, '#f59e0b'),
            ('Ganado', 3, '#22c55e')
        ) AS col(nombre, posicion, color)
        WHERE au.id NOT IN (SELECT DISTINCT user_id FROM columnas_kanban)
        UNION ALL
        SELECT
            au.id,
            'postventa',
            col.nombre,
            col.posicion,
            col.color
        FROM auth.users au
        CROSS JOIN (VALUES 
            ('Onboarding', 0, '#8b5cf6'),
            ('En Proceso', 1, '#3b82f6'),
            ('Por Facturar', 2, '#f59e0b'),
            ('Completado', 3, '#22c55e')
        ) AS col(nombre, posicion, color)
        WHERE au.id NOT IN (SELECT DISTINCT user_id FROM columnas_kanban);
        
        RAISE NOTICE 'Columnas Kanban creadas para % usuarios', user_without_columns_count;
    END IF;
END $$ LANGUAGE plpgsql;

-- ========================================
-- RESULTADO ESPERADO
-- ========================================
-- Este script debería:
-- 1. Crear perfiles faltantes para usuarios existentes
-- 2. Crear columnas Kanban por defecto para usuarios que no tienen
--
-- Después de ejecutar este script, deberías ver en el log:
-- - "Usuarios en profiles: X" (donde X es el número de perfiles)
-- - "Creados Y perfiles faltantes" (donde Y es el número de perfiles nuevos)
-- - "Usuarios sin columnas Kanban: Z"
-- - "Columnas Kanban creadas para Z usuarios"
--
-- Una vez hecho esto, cierra sesión y vuelve a entrar
-- Las páginas del dashboard deberían funcionar correctamente
