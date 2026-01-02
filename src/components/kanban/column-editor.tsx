'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface KanbanColumn {
  id: string;
  nombre: string;
  color: string;
  posicion: number;
}

interface ColumnEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (column: Partial<KanbanColumn>) => Promise<void>;
  column?: KanbanColumn | null;
  isEditing?: boolean;
}

const PREDEFINED_COLORS = [
  '#94a3b8', // gray
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#22c55e', // green
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export function ColumnEditor({ open, onClose, onSave, column, isEditing }: ColumnEditorProps) {
  const [formData, setFormData] = useState({
    nombre: column?.nombre || '',
    color: column?.color || PREDEFINED_COLORS[1],
    posicion: column?.posicion || 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return;

    setIsSubmitting(true);
    try {
      await onSave(formData);
      handleClose();
    } catch (error) {
      console.error('Error al guardar columna:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nombre: '',
      color: PREDEFINED_COLORS[1],
      posicion: 0
    });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Columna' : 'Nueva Columna'}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Modifica el nombre y color de la columna.' 
              : 'Añade una nueva columna a tu tablero kanban.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre de la columna *</Label>
            <Input
              id="nombre"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Ej: En Proceso, Por Contactar, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PREDEFINED_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`
                    w-10 h-10 rounded-lg border-2 transition-all
                    ${formData.color === color 
                      ? 'border-primary ring-2 ring-primary ring-offset-2 scale-110' 
                      : 'border-transparent hover:border-foreground/20'
                    }
                  `}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10 cursor-pointer"
              />
              <span className="text-xs text-muted-foreground">{formData.color}</span>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.nombre.trim()}>
              {isSubmitting ? 'Guardando...' : isEditing ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
