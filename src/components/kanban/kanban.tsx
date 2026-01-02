"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { MoreHorizontal, Plus, AlertCircle, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Ficha } from "@/types"
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
  OnDragEndResponder
} from "@hello-pangea/dnd"

interface KanbanColumn {
  id: string
  nombre: string
  color: string
  fichas: Ficha[]
}

interface KanbanBoardProps {
  columns: KanbanColumn[]
  onMoveCard: (fichaId: string, targetColumnId: string, fromColumnId: string) => void
  onEditColumn?: (columnId: string) => void
  onAddCard?: (columnId: string) => void
}

export function KanbanBoard({ columns, onMoveCard, onEditColumn, onAddCard }: KanbanBoardProps) {
  const [draggedCard, setDraggedCard] = useState<string | null>(null)
  const router = useRouter()

  const handleDragEnd: OnDragEndResponder = (result: DropResult) => {
    const { draggableId, destination, source } = result

    // Reset estado
    setDraggedCard(null)

    // Si no hay destino o es el mismo, no hacer nada
    if (!destination || !source) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    // Mover la tarjeta
    const fromColumnId = source.droppableId
    const targetColumnId = destination.droppableId

    onMoveCard(draggableId, targetColumnId, fromColumnId)
  }

  const handleBeforeDragStart = () => {
    setDraggedCard('dragging')
  }

  const handleCardClick = (fichaId: string, e: React.MouseEvent) => {
    // Solo navegar si no está arrastrando
    if (draggedCard) return

    // Evitar navegación si se hizo click en un botón
    if ((e.target as HTMLElement).closest('button')) return

    router.push(`/ficha/${fichaId}`)
  }

  const isGanado = (columnName: string) => {
    return columnName.toLowerCase().includes('ganado') ||
      columnName.toLowerCase().includes('completado')
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd} onBeforeDragStart={handleBeforeDragStart}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
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
                  {onAddCard && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onAddCard(column.id)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  )}
                  {onEditColumn && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onEditColumn(column.id)}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                  )}
                </div>
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
                                <ExternalLink className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
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
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </motion.div>
        ))}
      </div>
    </DragDropContext>
  )
}
