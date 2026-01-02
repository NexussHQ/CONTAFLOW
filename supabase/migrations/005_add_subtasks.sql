-- Migración 005: Agregar tabla de subtareas para el sistema de tareas
-- Esta migración permite que las tareas tengan subtareas y que la tarea macro
-- se complete automáticamente cuando todas sus subtareas estén completas

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
-- Los usuarios solo pueden ver y manipular subtareas de sus propias tareas
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
COMMENT ON TABLE subtasks IS 'Tabla de subtareas para el sistema de tareas. Las subtareas permiten desglosar tareas complejas en pasos más pequeños. Cuando todas las subtareas de una tarea están completadas, la tarea macro se marca automáticamente como completada.';

COMMENT ON FUNCTION check_subtasks_completion() IS 'Función que verifica si todas las subtareas de una tarea están completadas. Si todas están completadas, marca la tarea macro como completada. Si hay subtareas pendientes y una se desmarca, marca la tarea como pendiente.';
