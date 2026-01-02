"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Timeline } from "@/components/timeline/timeline"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Edit2, Phone, Mail, MapPin, Calendar, FileText, X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import type { Ficha, TimelineEvent } from "@/types"
import { getInitials, formatDateTime } from "@/lib/utils"
import { QRCodeSVG } from "qrcode.react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

interface EditedFichaState extends Partial<Ficha> {
  tipoNota?: string
  tituloNota?: string
  contenidoNota?: string
}

export default function FichaDetallePage() {
  const params = useParams()
  const router = useRouter()
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [loading, setLoading] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editedFicha, setEditedFicha] = useState<EditedFichaState>({})
  const [timeline, setTimeline] = useState<TimelineEvent[]>([])
  const [isTimelineMode, setIsTimelineMode] = useState(false)
  const { toast } = useToast()

  const cargarFicha = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("fichas")
      .select("*")
      .eq("id", params.id)
      .single()

    if (data) {
      setFicha(data)
      setEditedFicha(data)
    }
  }, [params.id])

  const cargarTimeline = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("timeline")
      .select("*")
      .eq("ficha_id", params.id)
      .order("fecha", { ascending: false })

    if (data) {
      setTimeline(data)
    }
  }, [params.id])

  useEffect(() => {
    cargarFicha()
    cargarTimeline()
  }, [params.id])

  const guardarCambios = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      await supabase
        .from("fichas")
        .update({
          nombre: editedFicha.nombre,
          ruc: editedFicha.ruc,
          telefono: editedFicha.telefono,
          email: editedFicha.email,
          relacion: editedFicha.relacion,
        })
        .eq("id", params.id)

      toast({
        title: "Éxito",
        description: "Ficha actualizada correctamente",
      })
      setEditMode(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrio un error inesperado",
      })
    } finally {
      setLoading(false)
    }
  }

  const agregarNota = async (tipo: TimelineEvent["tipo"], contenido: string, titulo?: string) => {
    const supabase = createClient()
    await supabase
      .from("timeline")
      .insert({
        ficha_id: params.id,
        tipo,
        contenido,
        titulo,
        fecha: new Date().toISOString(),
      })

    cargarTimeline()
    toast({
      title: "Nota agregada",
      description: "Se ha agregado al historial",
    })
  }

  const handleDelete = async () => {
    if (!confirm("Estas seguro que deseas eliminar esta ficha?")) return

    setLoading(true)
    try {
      const supabase = createClient()
      await supabase
        .from("fichas")
        .delete()
        .eq("id", params.id)

      router.push("/fichas")
      toast({
        title: "Eliminado",
        description: "Ficha eliminada correctamente",
      })
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Ocurrio un error inesperado",
      })
    } finally {
      setLoading(false)
    }
  }

  if (!ficha) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.push("/fichas")}>
          <X className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">
          {editMode ? "Editando Ficha" : "Detalle de Ficha"}
        </h1>
        {editMode && (
          <Button onClick={() => setEditMode(false)} variant="outline">
            Cancelar
          </Button>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Informacion principal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <Card>
              <CardContent className="space-y-6">
                {/* Avatar y nombre */}
                <div className="flex items-start gap-6 mb-6">
                  <Avatar className="h-24 w-24 text-3xl">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(ficha.nombre)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">{ficha.nombre}</h2>
                        <Badge variant="outline" className="capitalize ml-3">
                          {ficha.tipo}
                        </Badge>
                      </div>
                      {editMode ? (
                        <Select
                          value={editedFicha.relacion || ficha.relacion}
                          onValueChange={(value) => setEditedFicha({ ...editedFicha, relacion: value as any })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Relacion" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="cliente">Cliente</SelectItem>
                            <SelectItem value="socio">Socio</SelectItem>
                            <SelectItem value="colega">Colega</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-3 w-3 rounded-full",
                            ficha.relacion === "lead" && "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
                            ficha.relacion === "cliente" && "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
                            ficha.relacion === "socio" && "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
                            ficha.relacion === "colega" && "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300",
                          )}>
                            {ficha.relacion === "lead" && "L"}
                            {ficha.relacion === "cliente" && "C"}
                            {ficha.relacion === "socio" && "S"}
                            {ficha.relacion === "colega" && "Co"}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botones de accion */}
                    <div className="flex gap-2">
                      {!editMode && (
                        <Button onClick={() => setEditMode(true)} variant="outline" size="icon">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      )}
                      {editMode && (
                        <Button
                          onClick={guardarCambios}
                          disabled={loading}
                          variant="default"
                        >
                          {loading ? "Guardando..." : "Guardar"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Informacion de contacto */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-4">Informacion de Contacto</h3>

                  {ficha.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Email</p>
                        {editMode ? (
                          <Input
                            value={editedFicha.email || ""}
                            onChange={(e) => setEditedFicha({ ...editedFicha, email: e.target.value })}
                          />
                        ) : (
                          <p className="text-sm">{ficha.email}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {ficha.telefono && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Telefono</p>
                        {editMode ? (
                          <Input
                            value={editedFicha.telefono || ""}
                            onChange={(e) => setEditedFicha({ ...editedFicha, telefono: e.target.value })}
                          />
                        ) : (
                          <p className="text-sm">{ficha.telefono}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {ficha.ruc && (
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">RUC</p>
                        {editMode ? (
                          <Input
                            value={editedFicha.ruc || ""}
                            maxLength={13}
                            onChange={(e) => setEditedFicha({ ...editedFicha, ruc: e.target.value })}
                          />
                        ) : (
                          <p className="text-sm">{ficha.ruc}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Fechas y metadatos */}
            <Card>
              <CardHeader>
                <CardTitle>Metadatos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Creado</p>
                    <p className="font-semibold">{format(new Date(ficha.creado_at), "PPP", { locale: es })}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Ultima actualizacion</p>
                    <p className="font-semibold">{format(new Date(ficha.actualizado_at), "PPP", { locale: es })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle>QR Code</CardTitle>
                <CardDescription>
                  Escanea para ver el contacto en tu dispositivo
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center py-6">
                <div className="p-4 bg-white rounded-lg">
                  <QRCodeSVG
                    value={`https://leadflow.app/ficha/${ficha.id}`}
                    size={200}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Historial</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsTimelineMode(!isTimelineMode)}
                  >
                    {isTimelineMode ? "Vista completa" : "Modo compacto"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isTimelineMode ? (
                  <Timeline events={timeline} />
                ) : (
                  <div className="space-y-2">
                    {timeline.slice(0, 5).map((event) => {
                      const icons: Record<string, any> = {
                        nota: MessageSquare,
                        llamada: Phone,
                        email: Mail,
                        reunion: Calendar,
                        tarea: FileText,
                        sistema: Check,
                      }
                      const Icon = icons[event.tipo]

                      return (
                        <div key={event.id} className="flex gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(event.fecha)}
                            </p>
                            <p className="font-medium">{event.titulo || event.tipo}</p>
                            {event.contenido && (
                              <p className="text-sm mt-1">{event.contenido}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    <div className="text-center text-sm text-muted-foreground pt-4">
                      {timeline.length > 5 && "Mostrando los 5 registros mas recientes"}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Acciones peligrosas */}
            <Card>
              <CardHeader>
                <CardTitle>Acciones</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Eliminando..." : "Eliminar Ficha"}
                </Button>

                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      Convertir a Cliente
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Convertir a Cliente</DialogTitle>
                      <DialogDescription>
                        Esta ficha cambiará de tipo &quot;prospecto&quot; a &quot;cliente&quot;
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 py-4">
                      <Button
                        onClick={async () => {
                          if (!ficha) return
                          const supabase = createClient()
                          await supabase
                            .from("fichas")
                            .update({ tipo: "cliente" })
                            .eq("id", params.id)
                          router.push("/fichas")
                          toast({
                            title: "Éxito",
                            description: "Ficha convertida a cliente",
                          })
                        }}
                      >
                        Confirmar
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>

            {/* Nota rapida */}
            <Card>
              <CardHeader>
                <CardTitle>Nueva Nota</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select
                      onValueChange={(value) => setEditedFicha({ ...editedFicha, tipoNota: value as any })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nota">Nota</SelectItem>
                        <SelectItem value="llamada">Llamada</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="reunion">Reunion</SelectItem>
                        <SelectItem value="tarea">Tarea</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="titulo">Titulo</Label>
                    <Input
                      id="titulo"
                      value={editedFicha.tituloNota || ""}
                      onChange={(e) => setEditedFicha({ ...editedFicha, tituloNota: e.target.value })}
                      placeholder="Titulo (opcional)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="contenido">Contenido</Label>
                    <Textarea
                      id="contenido"
                      value={editedFicha.contenidoNota || ""}
                      onChange={(e) => setEditedFicha({ ...editedFicha, contenidoNota: e.target.value })}
                      placeholder="Escribe tu nota..."
                      rows={4}
                    />
                  </div>

                  <Button
                    onClick={() => {
                      if (editedFicha.tipoNota && editedFicha.contenidoNota) {
                        agregarNota(editedFicha.tipoNota as TimelineEvent["tipo"], editedFicha.contenidoNota, editedFicha.tituloNota)
                        setEditedFicha({ tipoNota: "", contenidoNota: "", tituloNota: "" })
                      }
                    }}
                  >
                    {loading ? "Agregando..." : "Agregar Nota"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar con timeline compacto */}
          {isTimelineMode && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: 0.1 }}
              className="w-full"
            >
              <Timeline events={timeline} />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

function Check({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function MessageSquare({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
