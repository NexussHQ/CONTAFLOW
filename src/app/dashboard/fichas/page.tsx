"use client"

import { useState, useEffect } from "react"
import { Search, Plus, FileText, Download, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FichaCard } from "@/components/ficha/ficha-card"
import { FichaForm } from "@/components/ficha/ficha-form"
import { ImportModal } from "@/components/import-export/import-modal"
import { Skeleton } from "@/components/ui/skeleton"
import type { Ficha } from "@/types"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"

export default function FichasPage() {
  const [fichas, setFichas] = useState<Ficha[]>([])
  const [search, setSearch] = useState("")
  const [filteredFichas, setFilteredFichas] = useState<Ficha[]>([])
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    cargarFichas()
  }, [])

  const cargarFichas = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from("fichas")
        .select("*")
        .order("creado_at", { ascending: false })

      if (error) throw error
      if (data) {
        setFichas(data)
        setFilteredFichas(data)
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las fichas",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (search) {
      const filtradas = fichas.filter(f =>
        f.nombre.toLowerCase().includes(search.toLowerCase()) ||
        f.email?.toLowerCase().includes(search.toLowerCase()) ||
        f.telefono?.includes(search) ||
        f.ruc?.includes(search)
      )
      setFilteredFichas(filtradas)
    } else {
      setFilteredFichas(fichas)
    }
  }, [search, fichas])

  const handleNuevaFicha = () => {
    setIsFormOpen(true)
  }

  const handleVerFicha = (ficha: Ficha) => {
    router.push(`/dashboard/ficha/${ficha.id}`)
  }

  const handleExportar = async () => {
    try {
      const response = await fetch("/api/fichas/export")
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = "fichas-leadflow.csv"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast({
          title: "Éxito",
          description: "Fichas exportadas correctamente",
        })
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron exportar las fichas",
      })
    }
  }

  const handleImport = async (contacts: any[], mapping: Record<string, string>) => {
    try {
      const response = await fetch("/api/fichas/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts, mapping }),
      })

      const result = await response.json()

      if (response.ok) {
        toast({
          title: "Importación exitosa",
          description: `Se importaron ${result.imported} de ${result.total} contactos`,
        })
        cargarFichas()
      } else {
        throw new Error(result.error || "Error al importar")
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Error al importar contactos",
      })
      throw error
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fichas</h1>
          <p className="text-muted-foreground">
            Gestiona tus prospectos y clientes ({fichas.length} total)
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={handleNuevaFicha}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Ficha
          </Button>
          <Button variant="outline" onClick={() => setIsImportOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button variant="outline" onClick={handleExportar}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email, teléfono..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          // Skeleton loading
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))
        ) : (
          filteredFichas.map((ficha) => (
            <FichaCard
              key={ficha.id}
              ficha={ficha}
              onClick={() => handleVerFicha(ficha)}
            />
          ))
        )}
      </div>

      {!loading && filteredFichas.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          {fichas.length === 0 ? (
            <div>
              <p className="mb-4">No hay fichas. Crea tu primera ficha.</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={handleNuevaFicha}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Ficha
                </Button>
                <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar CSV
                </Button>
              </div>
            </div>
          ) : (
            <p>No se encontraron resultados para &quot;{search}&quot;</p>
          )}
        </div>
      )}

      {/* Modal de crear ficha */}
      <Dialog open={isFormOpen} onOpenChange={(open) => setIsFormOpen(open)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Nueva Ficha</DialogTitle>
          </DialogHeader>
          <FichaForm
            onSuccess={() => {
              setIsFormOpen(false)
              cargarFichas()
            }}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de importación */}
      <ImportModal
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  )
}
