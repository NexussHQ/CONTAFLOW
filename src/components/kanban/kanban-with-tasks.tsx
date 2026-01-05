"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { MoreHorizontal, Plus, AlertCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Ficha, ColumnaKanban } from "@/types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  OnDragEndResponder,
} from "@hello-pangea/dnd";

interface KanbanColumn {
  id: string;
  nombre: string;
  color: string;
  fichas: Ficha[];
}

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onMoveCard: (fichaId: string, targetColumnId: string, fromColumnId: string) => void;
  onEditColumn?: (columnId: string) => void;
  onAddCard?: (columnId: string) => void;
  onCreateTask?: (columnId: string) => void;
}

interface NewTaskData {
  title: string;
  description: string;
  priority: string;
}

export function KanbanBoardWithTasks({ columns, onMoveCard, onEditColumn, onAddCard, onCreateTask }: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = useState<string | null>(null);
  const router = useRouter();
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [newTaskData, setNewTaskData] = useState<NewTaskData>({
    title: '',
    description: '',
    priority: 'normal',
  });

  const handleDragEnd: OnDragEndResponder = (result: DropResult) => {
    const { draggableId, destination, source } = result;

    setDraggedCard(null);

    if (!destination || !source) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const fromColumnId = source.droppableId;
    const targetColumnId = destination.droppableId;

    onMoveCard(draggableId, targetColumnId, fromColumnId);
  };

  const handleBeforeDragStart = () => {
    setDraggedCard('dragging');
  };

  const handleCardClick = (fichaId: string, e: React.MouseEvent) => {
    if (draggedCard) return;
    if ((e.target as HTMLElement).closest('button')) return;
    router.push(`/dashboard/ficha/${fichaId}`);
  };

  const isGanado = (columnName: string) => {
    return columnName.toLowerCase().includes('ganado') ||
      columnName.toLowerCase().includes('completado');
  };

  const handleCreateTask = async () => {
    if (!selectedColumnId) return;

    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No hay usuario autenticado');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: newTaskData.title,
          description: newTaskData.description || null,
          priority: newTaskData.priority === 'high' ? 'high' : 'normal',
          status: 'pending',
          ficha_id: selectedColumnId,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setIsTaskFormOpen(false);
        setNewTaskData({ title: '', description: '', priority: 'normal' });
        router.refresh();
      }
    } catch (error) {
      console.error('Error al crear tarea:', error);
      alert('Error al crear la tarea. Por favor intenta de nuevo.');
    }
  };

  const kanbanColumns = columns.map(col => ({
    id: col.id,
    nombre: col.nombre,
    color: col.color,
    fichas: col.fichas,
  }));

  return (
    <DragDropContext onDragEnd={handleDragEnd} onBeforeDragStart={handleBeforeDragStart}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {kanbanColumns.map((column) => (
          <motion.div
            key={column.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="min-w-[300px] w-80 rounded-lg border bg-card flex-shrink-0"
          >
            <div
              className="p-4 border-b"
              style={{ borderColor: column.color }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: column.color }}
                  />
                  <h3 className="font-semibold">{column.nombre}</h3>
                  {isGanado(column.nombre) && (
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{column.fichas.length}</Badge>

                  {/* Botón para crear tarea */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedColumnId(column.id);
                      setIsTaskFormOpen(true);
                    }}
                    title="Crear tarea en esta columna"
                    className="h-6 w-6"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>

                  {/* Botón para editar columna */}
                  {onEditColumn && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditColumn(column.id)}
                      title="Editar columna"
                      className="h-6 w-6"
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "p-3 space-y-2 min-h-[200px]",
                      snapshot.isDraggingOver && "bg-accent/50"
                    )}
                  >
                    {column.fichas.map((ficha, index) => (
                      <Draggable
                        key={ficha.id}
                        draggableId={ficha.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={(e) => handleCardClick(ficha.id, e)}
                            className={cn(
                              "bg-background border rounded-lg p-3 cursor-pointer hover:shadow-md hover:border-primary/50 transition-all group",
                              snapshot.isDragging && "shadow-lg opacity-90 cursor-grabbing rotate-2"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{ficha.nombre}</p>
                                  <ExternalLink
                                    className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                {ficha.email && (
                                  <p className="text-xs text-muted-foreground truncate">{ficha.email}</p>
                                )}
                                {ficha.telefono && (
                                  <p className="text-xs text-muted-foreground">{ficha.telefono}</p>
                                )}
                              </div>
                              <Badge
                                variant={ficha.tipo === 'cliente' ? 'default' : 'secondary'}
                                className="shrink-0 text-xs"
                              >
                                {ficha.tipo === 'cliente' ? 'C' : 'P'}
                              </Badge>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}
                    {column.fichas.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <p className="text-sm">Sin fichas</p>
                        <p className="text-xs opacity-70">Arrastra fichas aquí o crea una nueva tarea</p>
                      </div>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          </motion.div>
        ))}

        {/* Modal para crear tareas */}
        {isTaskFormOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Crear Tarea</h2>
                <p className="text-sm text-muted-foreground">
                  {columns.find(c => c.id === selectedColumnId)?.nombre || 'Nueva tarea'}
                </p>
                <button
                  onClick={() => {
                    setIsTaskFormOpen(false);
                    setSelectedColumnId(null);
                    setNewTaskData({ title: '', description: '', priority: 'normal' });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={newTaskData.title}
                    onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                    placeholder="Ej: Llamar al cliente"
                    className="w-full"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={newTaskData.description}
                    onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                    placeholder="Detalles adicionales..."
                    rows={3}
                    className="w-full resize-none"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Prioridad</Label>
                  <Select
                    value={newTaskData.priority}
                    onValueChange={(value) => setNewTaskData({ ...newTaskData, priority: value as 'high' | 'normal' })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccionar prioridad" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">Alta 🔥</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreateTask}
                  disabled={!newTaskData.title.trim()}
                  className="w-full"
                >
                  Crear Tarea
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
