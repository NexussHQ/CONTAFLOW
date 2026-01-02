"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, TrendingUp, Users, CheckCircle2, Clock, Plus, Flame, FileText, ArrowRight, CheckSquare } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Ficha } from "@/types"
import { formatDate } from "@/lib/utils"

interface Task {
  id: string
  title: string
  priority: 'high' | 'normal'
  status: 'pending' | 'completed'
  due_date?: string
  fichas?: { id: string; nombre: string }
}

interface TimelineEvent {
  id: string
  ficha_id: string
  tipo: string
  titulo?: string
  contenido?: string
  fecha: string
  fichas?: { nombre: string }
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalFichas: 0,
    clientes: 0,
    prospectos: 0,
    tareasPendientes: 0,
  })
  const [fichasRecientes, setFichasRecientes] = useState<Ficha[]>([])
  const [tareasHoy, setTareasHoy] = useState<Task[]>([])
  const [tareasAltas, setTareasAltas] = useState<Task[]>([])
  const [actividadReciente, setActividadReciente] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      // Cargar estadísticas de fichas
      const { data: fichasData } = await supabase
        .from('fichas')
        .select('tipo')

      if (fichasData) {
        const clientes = fichasData.filter(f => f.tipo === 'cliente').length
        const prospectos = fichasData.filter(f => f.tipo === 'prospecto').length
        setStats(prev => ({
          ...prev,
          totalFichas: fichasData.length,
          clientes,
          prospectos
        }))
      }

      // Cargar tareas pendientes count
      const { count: tasksCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')

      if (tasksCount !== null) {
        setStats(prev => ({ ...prev, tareasPendientes: tasksCount }))
      }

      // Cargar tareas de alta prioridad
      const { data: highTasks } = await supabase
        .from('tasks')
        .select('*, fichas(id, nombre)')
        .eq('status', 'pending')
        .eq('priority', 'high')
        .order('due_date', { ascending: true, nullsFirst: false })
        .limit(5)

      if (highTasks) {
        setTareasAltas(highTasks)
      }

      // Cargar tareas para hoy y vencidas
      const { data: todayTasks } = await supabase
        .from('tasks')
        .select('*, fichas(id, nombre)')
        .eq('status', 'pending')
        .lte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(5)

      if (todayTasks) {
        setTareasHoy(todayTasks)
      }

      // Cargar fichas recientes
      const { data: recentFichas } = await supabase
        .from('fichas')
        .select('*')
        .order('creado_at', { ascending: false })
        .limit(5)

      if (recentFichas) {
        setFichasRecientes(recentFichas)
      }

      // Cargar últimas actividades del timeline
      const { data: timelineData } = await supabase
        .from('timeline')
        .select('*, fichas(nombre)')
        .order('fecha', { ascending: false })
        .limit(3)

      if (timelineData) {
        setActividadReciente(timelineData)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleTask = async (taskId: string) => {
    const supabase = createClient()
    await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', taskId)

    cargarDatos()
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Focus Day</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Contactos</p>
                <p className="text-2xl font-bold">{stats.totalFichas}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Clientes</p>
                <p className="text-2xl font-bold">{stats.clientes}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Prospectos</p>
                <p className="text-2xl font-bold">{stats.prospectos}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tareas Pendientes</p>
                <p className="text-2xl font-bold">{stats.tareasPendientes}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid de dos columnas para tareas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Tareas de Alta Prioridad */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-red-500" />
              Prioridades Altas
            </CardTitle>
            <CardDescription>Tareas que necesitan atención urgente</CardDescription>
          </CardHeader>
          <CardContent>
            {tareasAltas.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                🎉 No tienes tareas de alta prioridad
              </p>
            ) : (
              <div className="space-y-3">
                {tareasAltas.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="h-5 w-5 mt-0.5 rounded-full border-2 border-red-500 hover:bg-red-100 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.fichas && (
                        <Link
                          href={`/ficha/${task.fichas.id}`}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          📌 {task.fichas.nombre}
                        </Link>
                      )}
                    </div>
                    {task.due_date && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(task.due_date)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/tasks" className="block mt-4">
              <Button variant="ghost" className="w-full">
                Ver todas las tareas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Tareas para Hoy */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Para Hoy
            </CardTitle>
            <CardDescription>Tareas vencidas o para completar hoy</CardDescription>
          </CardHeader>
          <CardContent>
            {tareasHoy.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                ✅ No tienes tareas para hoy
              </p>
            ) : (
              <div className="space-y-3">
                {tareasHoy.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="h-5 w-5 mt-0.5 rounded-full border-2 border-primary hover:bg-primary/10 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.fichas && (
                        <Link
                          href={`/ficha/${task.fichas.id}`}
                          className="text-xs text-muted-foreground hover:text-primary"
                        >
                          📌 {task.fichas.nombre}
                        </Link>
                      )}
                    </div>
                    {task.priority === 'high' && (
                      <Badge variant="destructive" className="text-xs">🔥</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Link href="/dashboard/tasks" className="block mt-4">
              <Button variant="ghost" className="w-full">
                Ver todas las tareas
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <Link href="/dashboard/fichas">
            <Button className="w-full h-16" variant="default">
              <Plus className="mr-2 h-5 w-5" />
              Nueva Ficha
            </Button>
          </Link>
          <Link href="/dashboard/tasks">
            <Button variant="outline" className="w-full h-16">
              <CheckSquare className="mr-2 h-5 w-5" />
              Nueva Tarea
            </Button>
          </Link>
          <Link href="/dashboard/ventas">
            <Button variant="outline" className="w-full h-16">
              <TrendingUp className="mr-2 h-5 w-5" />
              Kanban Ventas
            </Button>
          </Link>
          <Link href="/dashboard/postventa">
            <Button variant="outline" className="w-full h-16">
              <Calendar className="mr-2 h-5 w-5" />
              Kanban Operaciones
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Grid de dos columnas */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Fichas recientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contactos Recientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {fichasRecientes.map((ficha) => (
                <Link
                  key={ficha.id}
                  href={`/ficha/${ficha.id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {ficha.nombre.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{ficha.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {ficha.email || ficha.telefono || 'Sin contacto'}
                      </p>
                    </div>
                  </div>
                  <Badge variant={ficha.tipo === 'cliente' ? 'default' : 'secondary'}>
                    {ficha.tipo === 'cliente' ? '🟢' : '🔴'} {ficha.tipo}
                  </Badge>
                </Link>
              ))}
              {fichasRecientes.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No hay contactos aún
                </p>
              )}
            </div>
            <Link href="/dashboard/fichas" className="block mt-4">
              <Button variant="ghost" className="w-full">
                Ver todos los contactos
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Actividad reciente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {actividadReciente.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs">
                    {event.tipo === 'nota' && '📝'}
                    {event.tipo === 'llamada' && '📞'}
                    {event.tipo === 'email' && '📧'}
                    {event.tipo === 'reunion' && '📅'}
                    {event.tipo === 'tarea' && '✅'}
                    {event.tipo === 'sistema' && '⚙️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {event.titulo || event.tipo}
                    </p>
                    {event.fichas && (
                      <p className="text-xs text-muted-foreground">
                        {event.fichas.nombre}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(event.fecha)}
                    </p>
                  </div>
                </div>
              ))}
              {actividadReciente.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No hay actividad reciente
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
