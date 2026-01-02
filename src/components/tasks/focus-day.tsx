import { useTodayTasks } from '@/hooks/use-tasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TaskItem } from './task-item';
import type { Task } from '@/types';
import { Loader2, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface FocusDayProps {
  onCreateTask: () => void;
  onEditTask: (task: Task) => void;
  onToggleTask: (id: string) => Promise<boolean>;
  onDeleteTask: (id: string) => Promise<boolean>;
}

export function FocusDay({ onCreateTask, onEditTask, onToggleTask, onDeleteTask }: FocusDayProps) {
  const { tasks, loading } = useTodayTasks();
  const today = new Date();

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Focus Day
          </CardTitle>
          <CardDescription>
            {format(today, 'EEEE, d MMMM', { locale: es })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Focus Day
            </CardTitle>
            <CardDescription>
              {format(today, 'EEEE, d MMMM', { locale: es })}
            </CardDescription>
          </div>
          <Button onClick={onCreateTask} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[500px] overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-lg font-medium mb-2">Sin tareas para hoy</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crea tu primera tarea para organizar tu día
            </p>
            <Button onClick={onCreateTask} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Crear Tarea
            </Button>
          </div>
        ) : (
          <>
            {pendingTasks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  Pendientes ({pendingTasks.length})
                </h4>
                {pendingTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={onToggleTask}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                  />
                ))}
              </div>
            )}

            {completedTasks.length > 0 && (
              <div className="space-y-2 mt-6">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Completadas ({completedTasks.length})
                </h4>
                {completedTasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onToggle={onToggleTask}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
