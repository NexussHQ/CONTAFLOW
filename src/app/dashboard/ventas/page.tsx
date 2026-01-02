"use client"

import { useState, useEffect } from "react"
import { KanbanBoardWithTasks } from "@/components/kanban/kanban-with-tasks"
import { createClient } from "@/lib/supabase/client"
import type { Ficha, ColumnaKanban } from "@/types"
import { COLUMNAS_DEFAULT } from "@/types"
import { Plus, PartyPopper, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { FichaForm } from "@/components/ficha/ficha-form"
import { useRouter } from "next/navigation"

interface PendingConversion {
  fichaId: string
  fichaName: string
  targetColumnId: string
  fromColumnId: string
}

export default function VentasPage() {
  const [columns, setColumns] = useState<ColumnaKanban[]>([])
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [conversionModal, setConversionModal] = useState<PendingConversion | null>(null)
  const [isConverting, setIsConverting] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    const supabase = createClient()

    // Cargar columnas personalizadas o usar defaults
    const { data: columnasData } = await supabase
      .from('columnas_kanban')
      .select('*')
      .eq('tipo', 'ventas')
      .order('posicion')

    if (columnasData && columnasData.length > 0) {
      setColumns(columnasData as ColumnaKanban[])
    } else {
      // Usar columnas por defecto
      const defaultColumns: ColumnaKanban[] = COLUMNAS_DEFAULT.ventas.map((col, idx) => ({
        id: `default-ventas-${idx}`,
        user_id: '',
        tipo: 'ventas' as const,
        nombre: col.nombre,
        posicion: idx,
        color: col.color,
      }))
      setColumns(defaultColumns)
    }

    // Cargar fichas - todos los prospectos (leads) para el pipeline de ventas
    const { data: fichasData } = await supabase
      .from('fichas')
      .select('*')
      .eq('tipo', 'prospecto')
      .order('creado_at', { ascending: false })

    if (fichasData) {
      setFichas(fichasData)
    }
  }

  // Detectar si una columna es la columna final (Ganado)
  const isGanadoColumn = (columnId: string): boolean => {
    const column = columns.find(c => c.id === columnId)
    if (!column) return false

    // Detectar por nombre o por ser la última posición
    const isLastByPosition = column.posicion === Math.max(...columns.map(c => c.posicion))
    const isGanadoByName = column.nombre.toLowerCase().includes('ganado')

    return isLastByPosition || isGanadoByName
  }

  const handleMoveCard = async (fichaId: string, targetColumnId: string, fromColumnId: string) => {
    // Si se está moviendo a la columna "Ganado", mostrar modal de conversión
    if (isGanadoColumn(targetColumnId) && !isGanadoColumn(fromColumnId)) {
      const ficha = fichas.find(f => f.id === fichaId)
      if (ficha && ficha.tipo === 'prospecto') {
        // Mostrar modal de conversión
        setConversionModal({
          fichaId,
          fichaName: ficha.nombre,
          targetColumnId,
          fromColumnId
        })
        return // No mover hasta confirmar
      }
    }

    // Movimiento normal sin conversión
    await performMove(fichaId, targetColumnId)
  }

  const performMove = async (fichaId: string, targetColumnId: string) => {
    const supabase = createClient()

    await supabase
      .from('fichas')
      .update({ etapa_ventas: targetColumnId })
      .eq('id', fichaId)

    setFichas(fichas.map(f =>
      f.id === fichaId ? { ...f, etapa_ventas: targetColumnId } : f
    ))
  }

  const handleConvertToClient = async () => {
    if (!conversionModal) return

    setIsConverting(true)
    try {
      const supabase = createClient()
      const { fichaId, targetColumnId } = conversionModal

      // 1. Actualizar la ficha: cambiar tipo a cliente y mover a Ganado
      await supabase
        .from('fichas')
        .update({
          tipo: 'cliente',
          etapa_ventas: targetColumnId,
          etapa_postventa: null // Se asignará la primera columna de postventa
        })
        .eq('id', fichaId)

      // 2. Obtener la primera columna de postventa
      const { data: postventaColumns } = await supabase
        .from('columnas_kanban')
        .select('id')
        .eq('tipo', 'postventa')
        .order('posicion', { ascending: true })
        .limit(1)

      if (postventaColumns && postventaColumns.length > 0) {
        await supabase
          .from('fichas')
          .update({ etapa_postventa: postventaColumns[0].id })
          .eq('id', fichaId)
      }

      // 3. Registrar en timeline
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('timeline')
          .insert({
            ficha_id: fichaId,
            tipo: 'sistema',
            titulo: '🎉 Convertido a Cliente',
            contenido: 'El prospecto ha sido convertido a cliente y movido al pipeline de Operaciones.',
            fecha: new Date().toISOString()
          })
      }

      toast({
        title: "¡Felicidades! 🎉",
        description: `${conversionModal.fichaName} ahora es cliente y está en Operaciones.`,
      })

      // Remover de la lista de prospectos (ya no es prospecto)
      setFichas(fichas.filter(f => f.id !== fichaId))
      setConversionModal(null)

    } catch (error) {
      console.error('Error al convertir:', error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo convertir el prospecto a cliente.",
      })
    } finally {
      setIsConverting(false)
    }
  }

  const handleKeepAsLead = async () => {
    if (!conversionModal) return

    // Simplemente mover sin convertir
    await performMove(conversionModal.fichaId, conversionModal.targetColumnId)
    setConversionModal(null)

    toast({
      title: "Movido a Ganado",
      description: "El prospecto se mantiene como prospecto en la etapa Ganado.",
    })
  }

  const handleCancelConversion = () => {
    setConversionModal(null)
  }

  const handleAddCard = async (columnId: string) => {
    setIsFormOpen(true)
  }

  const handleCreateTask = async (columnId: string) => {
    // Crear tarea asociada a esta columna
    // El componente KanbanBoardWithTasks abrirá un modal para crear la tarea
    router.push('/dashboard/tasks')
  }

  const kanbanColumns = columns.map(col => ({
    id: col.id,
    nombre: col.nombre,
    color: col.color,
    fichas: fichas.filter(f => f.etapa_ventas === col.id || (!f.etapa_ventas && col.posicion === 0)),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel Ventas</h1>
          <p className="text-muted-foreground">
            Gestiona tu pipeline de ventas ({fichas.length} prospectos)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/tasks')}>
            📋 Tareas
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/fichas')}>
            👥 Fichas
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/postventa')}>
            📦 Postventa
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Ficha
          </Button>
        </div>
      </div>

      <KanbanBoardWithTasks
        columns={kanbanColumns}
        onMoveCard={handleMoveCard}
        onAddCard={handleAddCard}
        onCreateTask={handleCreateTask}
      />

      {/* Modal de creación de ficha */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nueva Ficha</DialogTitle>
          </DialogHeader>
          <FichaForm
            onSuccess={() => {
              setIsFormOpen(false)
              cargarDatos()
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de conversión automática al mover a "Ganado" */}
      <Dialog open={!!conversionModal} onOpenChange={(open) => !open && handleCancelConversion()}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <PartyPopper className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <DialogTitle>¡Venta Ganada!</DialogTitle>
                <DialogDescription>
                  {conversionModal?.fichaName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Has movido este prospecto a la etapa final. ¿Qué te gustaría hacer?
            </p>

            <div className="grid gap-3">
              <Button
                onClick={handleConvertToClient}
                disabled={isConverting}
                className="w-full justify-start h-auto py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                    <ArrowRight className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Convertir a Cliente</p>
                    <p className="text-xs opacity-80">
                      Cambia a cliente y muévelo a Operaciones
                    </p>
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={handleKeepAsLead}
                className="w-full justify-start h-auto py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    📋
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Mantener como Prospecto</p>
                    <p className="text-xs text-muted-foreground">
                      Solo mover a Ganado sin convertir
                    </p>
                  </div>
                </div>
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={handleCancelConversion}>
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
