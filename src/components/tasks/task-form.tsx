import { useEffect } from 'react';
import type { Task } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { taskSchema, type TaskInput } from '@/lib/validations';
import { CalendarIcon, Clock } from 'lucide-react';

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (task: Partial<Task>) => Promise<void>;
  editingTask?: Task | null;
  relatedContacts?: Array<{ id: string; nombre: string }>;
}

export function TaskForm({ open, onClose, onSubmit, editingTask, relatedContacts = [] }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'normal',
      status: 'pending',
      due_date: '',
      due_time: '',
      ficha_id: null,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: editingTask?.title || '',
        description: editingTask?.description || '',
        priority: editingTask?.priority || 'normal',
        status: editingTask?.status || 'pending',
        due_date: editingTask?.due_date || '',
        due_time: editingTask?.due_time || '',
        ficha_id: editingTask?.ficha_id || null,
      });
    }
  }, [open, editingTask, reset]);

  const onFormSubmit = async (data: TaskInput) => {
    try {
      // Filtrar valores nulos o vacíos para dates
      const cleanData = {
        ...data,
        due_date: data.due_date || null,
        due_time: data.due_time || null,
        ficha_id: data.ficha_id || null,
      };

      await onSubmit(cleanData as Partial<Task>);
      onClose();
    } catch (error) {
      console.error('Error al guardar tarea:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
          </DialogTitle>
          <DialogDescription>
            {editingTask ? 'Modifica los detalles de la tarea.' : 'Crea una nueva tarea para organizar tu día.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ej: Llamar al cliente para cerrar venta"
              {...register('title')}
              className={errors.title ? "border-red-500" : ""}
            />
            {errors.title && (
              <p className="text-xs text-red-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              placeholder="Detalles adicionales de la tarea..."
              rows={3}
              {...register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Prioridad</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta 🔥</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ficha_id">Relacionar con contacto</Label>
              <Controller
                name="ficha_id"
                control={control}
                render={({ field }) => (
                  <Select
                    onValueChange={(val) => field.onChange(val === "null" ? null : val)}
                    value={field.value || "null"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">Sin relación</SelectItem>
                      {relatedContacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="due_date" className="flex items-center gap-2">
                <CalendarIcon className="w-3 h-3" /> Fecha de vencimiento
              </Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_time" className="flex items-center gap-2">
                <Clock className="w-3 h-3" /> Hora
              </Label>
              <Input
                id="due_time"
                type="time"
                {...register('due_time')}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando...' : editingTask ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
