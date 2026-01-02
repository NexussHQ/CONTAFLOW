import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Task } from '@/types';
import { useTasksRealtime } from '@/hooks/use-realtime';

// Re-export for backward compatibility
export type { Task } from '@/types';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTask: (task: Partial<Task>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTaskStatus: (id: string) => Promise<boolean>;
}

export function useTasks(filters?: { status?: string; priority?: string }): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      let query = supabase
        .from('tasks')
        .select('*, fichas(id, nombre, tipo)');

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.priority) query = query.eq('priority', filters.priority);

      const { data, error: fetchError } = await query.order('due_date', { ascending: true, nullsFirst: false });

      let tasksData = data;
      let shouldThrowError = false;

      // Si la query falló y el error es sobre subtareas, intentar sin subtareas
      if (fetchError) {
        // Buscar si el error menciona 'subtasks' o la relación no existe
        const isSubtasksError = fetchError.message.includes('subtasks') ||
                                 fetchError.message.includes('relationship') ||
                                 fetchError.message.includes('42501'); // Undefined table error
        
        if (isSubtasksError) {
          console.warn('Tabla subtasks no existe aún, cargando tareas sin subtareas:', fetchError.message);
          
          // Retry sin intentar cargar subtareas
          query = supabase
            .from('tasks')
            .select('*, fichas(id, nombre, tipo)');
          
          if (filters?.status) query = query.eq('status', filters.status);
          if (filters?.priority) query = query.eq('priority', filters.priority);
          
          const { data: data2, error: fetchError2 } = await query.order('due_date', { ascending: true, nullsFirst: false });
          
          if (!fetchError2 && data2) {
            tasksData = data2;
            shouldThrowError = false;
          } else {
            shouldThrowError = true;
          }
        } else {
          // Error diferente a subtareas, lanzar el error
          shouldThrowError = true;
        }
      }

      if (shouldThrowError) {
        throw fetchError || new Error('Error al cargar tareas');
      }

      setTasks(tasksData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar tareas');
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  useTasksRealtime(() => {
    fetchTasks();
  });

  const createTask = useCallback(async (task: Partial<Task>): Promise<Task | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description || null,
          priority: task.priority || 'normal',
          status: 'pending',
          ficha_id: task.ficha_id || null,
          due_date: task.due_date || null,
          due_time: task.due_time || null,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      await fetchTasks();
      return data;
    } catch (err) {
      console.error('Error creating task:', err);
      return null;
    }
  }, [fetchTasks]);

  const updateTask = useCallback(async (id: string, updates: Partial<Task>): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          completed_at: updates.status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;
      await fetchTasks();
      return true;
    } catch (err) {
      console.error('Error updating task:', err);
      return false;
    }
  }, [fetchTasks]);

  const deleteTask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchTasks();
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      return false;
    }
  }, [fetchTasks]);

  const toggleTaskStatus = useCallback(async (id: string): Promise<boolean> => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return false;

      const newStatus = task.status === 'pending' ? 'completed' : 'pending';
      return await updateTask(id, { status: newStatus });
    } catch (err) {
      console.error('Error toggling task status:', err);
      return false;
    }
  }, [tasks, updateTask]);

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus
  };
}

export function useTodayTasks() {
  const today = new Date().toISOString().split('T')[0];
  return useTasks({ status: 'pending' });
}

export function useHighPriorityTasks() {
  return useTasks({ status: 'pending', priority: 'high' });
}

export function useCompletedTasks() {
  return useTasks({ status: 'completed' });
}
