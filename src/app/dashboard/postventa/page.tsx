"use client"

import { useState, useEffect } from "react"
import { KanbanBoardWithTasks } from "@/components/kanban/kanban-with-tasks"
import { createClient } from "@/lib/supabase/client"
import type { Ficha, ColumnaKanban } from "@/types"
import { COLUMNAS_DEFAULT } from "@/types"
import { Plus } from "lucide-react"
import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export default function PostVentaPage() {
  const [columns, setColumns] = useState<ColumnaKanban[]>([])
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Cargar columnas personalizadas o usar defaults
      const { data: columnasData } = await supabase
        .from('columnas_kanban')
        .select('*')
        .eq('tipo', 'postventa')
        .order('posicion')

      if (columnasData && columnasData.length > 0) {
        setColumns(columnasData as ColumnaKanban[])
      } else {
        const defaultColumns = COLUMNAS_DEFAULT.postventa.map((col, idx): ColumnaKanban => ({
          id: `default-postventa-${idx}`,
          user_id: '',
          tipo: 'postventa' as const,
          nombre: col.nombre,
          posicion: idx,
          color: col.color,
        }))
        setColumns(defaultColumns)
      }

      // FIX: Cargar TODOS los clientes, no filtrar por etapa hardcodeada
      const { data: fichasData } = await supabase
        .from('fichas')
        .select('*')
        .eq('tipo', 'cliente')
        .order('creado_at', { ascending: false })

      if (fichasData) {
        setFichas(fichasData)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMoveCard = async (fichaId: string, targetColumnId: string, _fromColumnId: string) => {
    const supabase = createClient()

    const { error } = await supabase
      .from('fichas')
      .update({ etapa_postventa: targetColumnId })
      .eq('id', fichaId)

    if (error) {
      console.error('Error moviendo ficha:', error)
      return
    }

    setFichas(fichas.map(f =>
      f.id === fichaId ? { ...f, etapa_postventa: targetColumnId } : f
    ))
  }

  const handleCreateTask = async (columnId: string) => {
    router.push('/dashboard/tasks')
  }

  const kanbanColumns = columns.map(col => ({
    id: col.id,
    nombre: col.nombre,
    color: col.color,
    fichas: fichas.filter(f => f.etapa_postventa === col.id || (!f.etapa_postventa && col.posicion === 0)),
  }))

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Panel Post-Venta</h1>
          <p className="text-muted-foreground">
            Gestiona la operativa de servicios
          </p>
        </div>
        <div className="flex gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="min-w-[300px] space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel Post-Venta</h1>
          <p className="text-muted-foreground">
            Gestiona la operativa de servicios ({fichas.length} clientes)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/tasks')}>
            📋 Tareas
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/fichas')}>
            👥 Fichas
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/ventas')}>
            💰 Ventas
          </Button>
        </div>
      </div>

      <KanbanBoardWithTasks
        columns={kanbanColumns}
        onMoveCard={handleMoveCard}
        onCreateTask={handleCreateTask}
      />
    </div>
  )
}
