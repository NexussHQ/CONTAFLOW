'use client';

import { useState } from 'react';
import { useTasks } from '@/hooks/use-tasks';
import { useContacts } from '@/hooks/use-contacts';
import { TaskForm } from '@/components/tasks/task-form';
import { TaskItem } from '@/components/tasks/task-item';
import { TaskItemWithSubtasks } from '@/components/tasks/task-item-with-subtasks';
import { CalendarView } from '@/components/tasks/calendar-view';
import { Task } from '@/hooks/use-tasks';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, Filter, Calendar as CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TasksPage() {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'pending' | 'completed' | 'high' | 'calendar'>('all');
  
  const { tasks, loading, error, createTask, updateTask, deleteTask, toggleTaskStatus, refetch } = useTasks();
  const { contacts } = useContacts();

  const relatedContacts = contacts.map(c => ({ id: c.id, nombre: c.nombre }));

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === 'all' || task.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || task.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending');
  const completedTasks = filteredTasks.filter(t => t.status === 'completed');
  const highPriorityTasks = filteredTasks.filter(t => t.priority === 'high' && t.status === 'pending');

  const handleCreateTask = async (taskData: Partial<Task>) => {
    const success = await createTask(taskData);
    if (success) {
      setIsFormOpen(false);
    }
  };

  const handleUpdateTask = async (taskData: Partial<Task>) => {
    if (!editingTask) return;
    const success = await updateTask(editingTask.id, taskData);
    if (success) {
      setEditingTask(null);
      setIsFormOpen(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta tarea?')) {
      return await deleteTask(id);
    }
    return false;
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingTask(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tareas</h1>
          <p className="text-muted-foreground">
            Gestiona tus tareas y mantén todo organizado
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Tarea
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-lg">
          {error}
        </div>
      )}

      <Tabs defaultValue="all" value={viewMode} onValueChange={(v) => setViewMode(v as 'all' | 'pending' | 'completed' | 'high' | 'calendar')} className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="all">
              Lista
            </TabsTrigger>
            <TabsTrigger value="calendar">
              <CalendarIcon className="h-4 w-4 mr-1" />
              Calendario
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            {viewMode === 'all' && (
              <>
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="high">Alta 🔥</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </div>

        <TabsContent value="all" className="space-y-3">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium mb-2">No hay tareas</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primera tarea para comenzar
              </p>
              <Button onClick={() => setIsFormOpen(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Crear Tarea
              </Button>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <TaskItemWithSubtasks
                key={task.id}
                task={task}
                onToggle={toggleTaskStatus}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-3">
          {pendingTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h3 className="text-lg font-medium mb-2">Todo al día</h3>
              <p className="text-sm text-muted-foreground">
                No tienes tareas pendientes
              </p>
            </div>
          ) : (
            pendingTasks.map((task) => (
              <TaskItemWithSubtasks
                key={task.id}
                task={task}
                onToggle={toggleTaskStatus}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completedTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium mb-2">Sin tareas completadas</h3>
              <p className="text-sm text-muted-foreground">
                Completa tu primera tarea para verla aquí
              </p>
            </div>
          ) : (
            completedTasks.map((task) => (
              <TaskItemWithSubtasks
                key={task.id}
                task={task}
                onToggle={toggleTaskStatus}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))
          )}
        </TabsContent>

        <TabsContent value="high" className="space-y-3">
          {highPriorityTasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔥</div>
              <h3 className="text-lg font-medium mb-2">Sin tareas urgentes</h3>
              <p className="text-sm text-muted-foreground">
                Marca tareas como alta prioridad para verlas aquí
              </p>
            </div>
          ) : (
            highPriorityTasks.map((task) => (
              <TaskItemWithSubtasks
                key={task.id}
                task={task}
                onToggle={toggleTaskStatus}
                onEdit={handleEditTask}
                onDelete={handleDeleteTask}
              />
            ))
          )}
        </TabsContent>
        {/* Vista de calendario */}
        <TabsContent value="calendar" className="space-y-4">
          <CalendarView
            onCreateTask={async (date?: string) => {
              // Crear tarea con la fecha seleccionada
              if (editingTask) {
                await updateTask(editingTask.id, { due_date: date || null });
                setEditingTask(null);
              } else {
                await createTask({ due_date: date || null, title: 'Nueva tarea' });
              }
              setIsFormOpen(true);
            }}
            onViewTask={(task) => {
              setEditingTask(task);
              setIsFormOpen(true);
            }}
          />
        </TabsContent>
      </Tabs>

      <TaskForm
        open={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
        editingTask={editingTask}
        relatedContacts={relatedContacts}
      />
    </div>
  );
}
