import React, { useState } from 'react';
import type { Subtask } from '@/types';
import { SubtaskItem } from './subtask-item';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus } from 'lucide-react';
import { useSubtasks } from '@/hooks/use-subtasks';

interface SubtaskListProps {
  taskId: string;
  onSubtaskToggle?: (subtask: Subtask) => void;
  onSubtaskDelete?: (subtask: Subtask) => void;
}

export function SubtaskList({ taskId, onSubtaskToggle, onSubtaskDelete }: SubtaskListProps) {
  const { subtasks, createSubtask, deleteSubtask, toggleSubtaskStatus, reorderSubtasks } = useSubtasks(taskId);
  const [isAdding, setIsAdding] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;

    const newSubtask = await createSubtask({
      task_id: taskId,
      title: newSubtaskTitle.trim(),
    });

    if (newSubtask) {
      setNewSubtaskTitle('');
      setIsAdding(false);
      if (onSubtaskToggle) onSubtaskToggle(newSubtask);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSubtask();
    } else if (e.key === 'Escape') {
      setIsAdding(false);
      setNewSubtaskTitle('');
    }
  };

  const handleToggle = async (id: string) => {
    const subtask = subtasks.find(s => s.id === id);
    const success = await toggleSubtaskStatus(id);
    if (success && subtask && onSubtaskToggle) {
      onSubtaskToggle(subtask);
    }
    return success;
  };

  const handleDelete = async (id: string) => {
    const subtask = subtasks.find(s => s.id === id);
    const success = await deleteSubtask(id);
    if (success && subtask && onSubtaskDelete) {
      onSubtaskDelete(subtask);
    }
    return success;
  };

  const handleEdit = async (id: string, title: string) => {
    // Implementación futura: editar subtarea
    console.log('Editar subtarea:', id, title);
    return true;
  };

  // Calcular progreso
  const completedCount = subtasks.filter(s => s.completed).length;
  const totalCount = subtasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Progreso de subtareas */}
      {totalCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {completedCount} de {totalCount} subtareas completadas
            </span>
            <span className="font-semibold">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary rounded-full h-2 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Lista de subtareas */}
      {subtasks.length > 0 && (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <SubtaskItem
              key={subtask.id}
              subtask={subtask}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      {/* Formulario para agregar subtarea */}
      {isAdding && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
          <Input
            value={newSubtaskTitle}
            onChange={(e) => setNewSubtaskTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nueva subtarea..."
            className="flex-1"
            autoFocus
          />
          <Button
            type="button"
            onClick={handleAddSubtask}
            disabled={!newSubtaskTitle.trim()}
            size="sm"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Botón para agregar subtarea */}
      {!isAdding && (
        <Button
          variant="outline"
          onClick={() => {
            setIsAdding(true);
            setNewSubtaskTitle('');
          }}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Subtarea
        </Button>
      )}

      {/* Mensaje cuando no hay subtareas */}
      {subtasks.length === 0 && !isAdding && (
        <div className="text-center py-6 text-sm text-muted-foreground">
          No hay subtareas. Agrega la primera para comenzar.
        </div>
      )}
    </div>
  );
}
