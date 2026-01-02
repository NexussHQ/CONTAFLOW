import type { Task } from '@/types';
import { PRIORITIES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => Promise<boolean>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export function TaskItem({ task, onToggle, onEdit, onDelete }: TaskItemProps) {
  const priorityConfig = PRIORITIES[task.priority];

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status === 'pending';
  const isDueToday = task.due_date && new Date(task.due_date).toDateString() === new Date().toDateString() && task.status === 'pending';

  return (
    <Card className={cn(
      'p-4 transition-all hover:shadow-md',
      task.status === 'completed' && 'opacity-60',
      isOverdue && 'border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20',
      isDueToday && !isOverdue && 'border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-950/20'
    )}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          onChange={() => onToggle(task.id)}
          className="mt-1 h-5 w-5 rounded border-gray-300"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={cn(
                'font-medium text-sm',
                task.status === 'completed' && 'line-through text-muted-foreground'
              )}>
                {task.title}
              </h4>

              {task.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>

            <div className="flex gap-1">
              {task.priority === 'high' && (
                <Badge variant="outline" className="text-xs">
                  {priorityConfig.emoji || ''} {priorityConfig.label}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-2">
            {task.due_date && (
              <span className={cn(
                'text-xs flex items-center gap-1',
                isOverdue ? 'text-red-600' : 'text-muted-foreground'
              )}>
                📅 {format(new Date(task.due_date), 'dd MMM', { locale: es })}
                {task.due_time && ` ${task.due_time}`}
                {isOverdue && ' (Vencida)'}
              </span>
            )}

            {task.fichas && (
              <Badge variant="secondary" className="text-xs">
                📌 {task.fichas.nombre}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(task)}
            className="h-8 w-8 p-0"
          >
            ✏️
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id)}
            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
          >
            🗑️
          </Button>
        </div>
      </div>
    </Card>
  );
}
