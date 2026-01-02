import React from 'react';
import type { Subtask } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, X, GripVertical, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onEdit: (id: string, title: string) => Promise<boolean>;
  isDragging?: boolean;
}

export function SubtaskItem({ subtask, onToggle, onDelete, onEdit, isDragging }: SubtaskItemProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editTitle, setEditTitle] = React.useState(subtask.title);

  const handleSaveEdit = async () => {
    if (editTitle.trim() && editTitle !== subtask.title) {
      await onEdit(subtask.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setEditTitle(subtask.title);
      setIsEditing(false);
    }
  };

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg bg-muted/30 transition-all",
      isDragging && "opacity-50"
    )}>
      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
      
      <input
        type="checkbox"
        checked={subtask.completed}
        onChange={() => onToggle(subtask.id)}
        className="h-4 w-4 rounded border-gray-300"
      />

      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={handleSaveEdit}
          onKeyDown={handleKeyDown}
          className="flex-1 h-8"
          autoFocus
        />
      ) : (
        <span
          onClick={() => setIsEditing(true)}
          className={cn(
            "flex-1 text-sm cursor-text",
            subtask.completed && "line-through text-muted-foreground"
          )}
        >
          {subtask.title}
        </span>
      )}

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(subtask.id)}
          className="h-6 w-6 text-destructive hover:text-destructive"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
