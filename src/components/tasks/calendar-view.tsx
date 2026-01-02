import { useState, useMemo } from 'react';
import type { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TaskForm } from './task-form';
import { TaskItemWithSubtasks } from './task-item-with-subtasks';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon } from 'lucide-react';
import { useTasks } from '@/hooks/use-tasks';
import { Badge } from '@/components/ui/badge';

interface CalendarViewProps {
  onCreateTask?: (date?: string) => void;
  onViewTask?: (task: Task) => void;
}

// Nombres de los días de la semana
const DAYS_OF_WEEK = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

// Nombres de los meses
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export function CalendarView({ onCreateTask, onViewTask }: CalendarViewProps) {
  const { tasks, loading, createTask, refetch } = useTasks();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  
  // Obtener el año y mes actual
  const year = selectedYear;
  const month = selectedMonth;
  
  // Obtener tareas del mes actual
  const monthTasks = useMemo(() => {
    const tasksInMonth = tasks.filter(task => {
      if (!task.due_date) return false;
      const taskDate = new Date(task.due_date);
      return taskDate.getFullYear() === year && taskDate.getMonth() === month;
    });
    
    // Agrupar tareas por fecha
    const grouped: Record<string, Task[]> = {};
    tasksInMonth.forEach(task => {
      if (task.due_date) {
        const dateKey = task.due_date;
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(task);
      }
    });
    
    return grouped;
  }, [tasks, year, month]);
  
  // Obtener días del mes
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  
  // Generar array de días del mes
  const days = useMemo(() => {
    const days: (Date | null)[] = [];
    
    // Añadir días vacíos al principio
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    
    // Añadir días del mes
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  }, [year, month, firstDayOfMonth, daysInMonth]);
  
  // Navegación por mes
  const goToPreviousMonth = () => {
    const newMonth = month - 1;
    if (newMonth < 0) {
      setSelectedMonth(11);
      setSelectedYear(year - 1);
    } else {
      setSelectedMonth(newMonth);
    }
  };
  
  const goToNextMonth = () => {
    const newMonth = month + 1;
    if (newMonth > 11) {
      setSelectedMonth(0);
      setSelectedYear(year + 1);
    } else {
      setSelectedMonth(newMonth);
    }
  };
  
  const goToPreviousYear = () => {
    setSelectedYear(year - 1);
  };
  
  const goToNextYear = () => {
    setSelectedYear(year + 1);
  };
  
  // Navegación a fecha específica
  const goToToday = () => {
    const today = new Date();
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };
  
  const goToMonth = (targetYear: number, targetMonth: number) => {
    setSelectedYear(targetYear);
    setSelectedMonth(targetMonth);
  };
  
  // Manejar clic en un día
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    if (onCreateTask) {
      onCreateTask(date.toISOString().split('T')[0]);
    }
  };
  
  // Manejar clic en una tarea
  const handleTaskClick = (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (onViewTask) {
      onViewTask(task);
    } else {
      setSelectedTask(task);
    }
  };
  
  // Verificar si un día es hoy
  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };
  
  // Obtener tareas de un día específico
  const getTasksForDay = (date: Date) => {
    const dateKey = date.toISOString().split('T')[0];
    return monthTasks[dateKey] || [];
  };
  
  // Obtener lista de años (hace 5 años hasta 5 años en el futuro)
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearList: number[] = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      yearList.push(i);
    }
    return yearList;
  }, []);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[600px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Header del calendario con controles de navegación */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-muted-foreground" />
          <h2 className="text-2xl font-bold">
            {MONTH_NAMES[month]} {year}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector de año */}
          <select
            value={year}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          
          {/* Selector de mes */}
          <select
            value={month}
            onChange={(e) => goToMonth(year, parseInt(e.target.value))}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          
          {/* Botón Ir a hoy */}
          <Button onClick={goToToday} variant="outline" size="sm">
            Hoy
          </Button>
          
          {/* Botones de navegación por año */}
          <Button onClick={goToPreviousYear} variant="ghost" size="icon" title="Año anterior">
            <ChevronLeft className="h-5 w-5" />
            <ChevronLeft className="h-3 w-3 -ml-4" />
          </Button>
          <Button onClick={goToNextYear} variant="ghost" size="icon" title="Siguiente año">
            <ChevronRight className="h-5 w-5" />
            <ChevronRight className="h-3 w-3 -ml-4" />
          </Button>
          
          {/* Botones de navegación por mes */}
          <Button onClick={goToPreviousMonth} variant="ghost" size="icon" title="Mes anterior">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button onClick={goToNextMonth} variant="ghost" size="icon" title="Siguiente mes">
            <ChevronRight className="h-5 w-5" />
          </Button>
          
          {/* Botón para crear tarea */}
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Tarea
          </Button>
        </div>
      </div>
      
      {/* Calendario */}
      <div className="border rounded-lg p-4 bg-background">
        {/* Días de la semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Días del mes */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }
            
            const dayTasks = getTasksForDay(date);
            const isTodayDate = isToday(date);
            const dateString = date.toISOString().split('T')[0];
            
            return (
              <div
                key={dateString}
                onClick={() => handleDayClick(date)}
                className={`
                  aspect-square rounded-md p-2 cursor-pointer transition-all
                  hover:bg-muted relative overflow-hidden
                  ${isTodayDate ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/30'}
                `}
              >
                <div className="text-sm font-medium mb-1">
                  {date.getDate()}
                </div>
                
                {/* Lista de tareas del día */}
                {dayTasks.length > 0 && (
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task) => (
                      <div
                        key={task.id}
                        onClick={(e) => handleTaskClick(e, task)}
                        className={`
                          text-xs p-1 rounded truncate cursor-pointer
                          ${task.status === 'completed' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100' 
                            : task.priority === 'high'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                          }
                        `}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayTasks.length - 3} más
                      </div>
                    )}
                  </div>
                )}
                
                {/* Indicador de tareas pendientes */}
                {dayTasks.some(t => t.status === 'pending') && (
                  <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Formulario de tarea */}
      <TaskForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (taskData) => {
          const newTask = await createTask(taskData);
          if (newTask) {
            await refetch();
            setIsFormOpen(false);
          }
        }}
        editingTask={null}
      />
      
      {/* Detalle de tarea seleccionada */}
      {selectedTask && (
        <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles de Tarea</DialogTitle>
            </DialogHeader>
            <TaskItemWithSubtasks
              task={selectedTask}
              onToggle={async (id: string) => {
                // Aquí podrías implementar la lógica de toggle
                return false;
              }}
              onEdit={() => {
                setSelectedTask(null);
                setIsFormOpen(true);
              }}
              onDelete={async (id: string) => {
                // Aquí podrías implementar la lógica de delete
                return false;
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
