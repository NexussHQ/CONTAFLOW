"use client"

import { useState } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DialogFooter } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { fichaSchema, type FichaInput } from "@/lib/validations"

export function FichaForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FichaInput>({
    resolver: zodResolver(fichaSchema),
    defaultValues: {
      tipo: 'prospecto',
      nombre: '',
      ruc: '',
      telefono: '',
      email: '',
      relacion: 'lead',
    },
  })

  const onSubmit = async (data: FichaInput) => {
    setLoading(true)
    try {
      const response = await fetch('/api/fichas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast({
          title: 'Éxito',
          description: 'Ficha creada correctamente',
        })
        onSuccess()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al crear ficha')
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Ocurrió un error inesperado',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tipo">Tipo</Label>
          <Controller
            name="tipo"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prospecto">Prospecto</SelectItem>
                  <SelectItem value="cliente">Cliente</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.tipo && (
            <p className="text-sm text-destructive">{errors.tipo.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="relacion">Relación</Label>
          <Controller
            name="relacion"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar relación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead">🔴 Lead</SelectItem>
                  <SelectItem value="cliente">🟢 Cliente</SelectItem>
                  <SelectItem value="socio">🔵 Socio</SelectItem>
                  <SelectItem value="colega">🟣 Colega</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.relacion && (
            <p className="text-sm text-destructive">{errors.relacion.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input
            id="nombre"
            placeholder="Nombre completo"
            {...register('nombre')}
            disabled={loading}
            className={errors.nombre ? "border-destructive" : ""}
          />
          {errors.nombre && (
            <p className="text-sm text-destructive">{errors.nombre.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="ruc">RUC (13 dígitos)</Label>
          <Input
            id="ruc"
            placeholder="1234567890123"
            maxLength={13}
            {...register('ruc')}
            disabled={loading}
            className={errors.ruc ? "border-destructive" : ""}
          />
          {errors.ruc && (
            <p className="text-sm text-destructive">{errors.ruc.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              placeholder="+593 9..."
              {...register('telefono')}
              disabled={loading}
            />
            {errors.telefono && (
              <p className="text-sm text-destructive">{errors.telefono.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@ejemplo.com"
              {...register('email')}
              disabled={loading}
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>
      </div>

      <DialogFooter className="gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Crear Ficha'}
        </Button>
      </DialogFooter>
    </form>
  )
}
