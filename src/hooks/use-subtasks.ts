import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Subtask } from '@/types';

interface UseSubtasksReturn {
  subtasks: Subtask[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createSubtask: (subtask: Partial<Subtask>) => Promise<Subtask | null>;
  updateSubtask: (id: string, updates: Partial<Subtask>) => Promise<boolean>;
  deleteSubtask: (id: string) => Promise<boolean>;
  toggleSubtaskStatus: (id: string) => Promise<boolean>;
  reorderSubtasks: (taskId: string, newOrder: string[]) => Promise<boolean>;
}

export function useSubtasks(taskId?: string): UseSubtasksReturn {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubtasks = useCallback(async () => {
    if (!taskId) {
      setSubtasks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const supabase = createClient();

      const { data, error: fetchError } = await supabase
        .from('subtasks')
        .select('*')
        .eq('task_id', taskId)
        .order('order_index', { ascending: true });

      if (fetchError) throw fetchError;
      setSubtasks(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar subtareas');
      console.error('Error fetching subtasks:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  const createSubtask = useCallback(async (subtask: Partial<Subtask>): Promise<Subtask | null> => {
    try {
      const supabase = createClient();
      
      // Calcular el order_index automáticamente como el último + 1
      const maxOrder = subtasks.length > 0 
        ? Math.max(...subtasks.map(s => s.order_index)) 
        : -1;

      const { data, error } = await supabase
        .from('subtasks')
        .insert({
          task_id: subtask.task_id,
          title: subtask.title,
          description: subtask.description || null,
          completed: false,
          order_index: maxOrder + 1,
        })
        .select()
        .single();

      if (error) throw error;
      await fetchSubtasks();
      return data;
    } catch (err) {
      console.error('Error creating subtask:', err);
      return null;
    }
  }, [subtasks.length, fetchSubtasks]);

  const updateSubtask = useCallback(async (id: string, updates: Partial<Subtask>): Promise<boolean> => {
    try {
      const supabase = createClient();

      // Si se está marcando como completada, agregar completed_at
      const updateData = {
        ...updates,
        completed_at: updates.completed === true ? new Date().toISOString() : (updates.completed === false ? null : undefined),
      };

      const { error } = await supabase
        .from('subtasks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
      await fetchSubtasks();
      return true;
    } catch (err) {
      console.error('Error updating subtask:', err);
      return false;
    }
  }, [fetchSubtasks]);

  const deleteSubtask = useCallback(async (id: string): Promise<boolean> => {
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchSubtasks();
      return true;
    } catch (err) {
      console.error('Error deleting subtask:', err);
      return false;
    }
  }, [fetchSubtasks]);

  const toggleSubtaskStatus = useCallback(async (id: string): Promise<boolean> => {
    try {
      const subtask = subtasks.find(s => s.id === id);
      if (!subtask) return false;

      const newStatus = !subtask.completed;
      return await updateSubtask(id, { completed: newStatus });
    } catch (err) {
      console.error('Error toggling subtask status:', err);
      return false;
    }
  }, [subtasks, updateSubtask]);

  const reorderSubtasks = useCallback(async (taskId: string, newOrder: string[]): Promise<boolean> => {
    try {
      const supabase = createClient();

      // Actualizar el order_index de todas las subtareas
      const updates = newOrder.map((id, index) => ({
        id,
        order_index: index,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('subtasks')
          .update({ order_index: update.order_index })
          .eq('id', update.id);

        if (error) throw error;
      }

      await fetchSubtasks();
      return true;
    } catch (err) {
      console.error('Error reordering subtasks:', err);
      return false;
    }
  }, [fetchSubtasks]);

  return {
    subtasks,
    loading,
    error,
    refetch: fetchSubtasks,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtaskStatus,
    reorderSubtasks,
  };
}
