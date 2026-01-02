"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { FileSpreadsheet, FileText, Download } from "lucide-react"

export function ExportDialog({ fichasCount }: { fichasCount: number }) {
  const [loading, setLoading] = useState(false)
  const [format, setFormat] = useState<'csv' | 'xlsx'>('csv')

  const handleExport = async () => {
    setLoading(true)
    try {
      // Obtener todas las fichas desde Supabase
      const response = await fetch('/api/fichas/export')

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `fichas-leadflow.${format}`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error al exportar:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent className="sm:max-w-[400px]">
      <DialogHeader>
        <DialogTitle>Exportar Fichas</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <p className="text-sm text-muted-foreground">
          Total de fichas: <span className="font-semibold">{fichasCount}</span>
        </p>

        <div className="space-y-2">
          <label className="flex items-center gap-3 text-sm font-medium">
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
              className="w-4 h-4 text-primary"
            />
            <span>CSV</span>

            <input
              type="radio"
              name="format"
              value="xlsx"
              checked={format === 'xlsx'}
              onChange={() => setFormat('xlsx')}
              className="w-4 h-4 text-primary"
            />
            <span>XLSX</span>
          </label>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="h-4 w-4" />
              <span className="font-medium">CSV:</span>
              <span className="text-muted-foreground">
                Formato universal, compatible con Excel
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="font-medium">XLSX:</span>
              <span className="text-muted-foreground">
                Formato Excel, con más formatos
              </span>
            </div>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={handleExport} disabled={loading}>
          {loading ? (
            <>
              <Download className="mr-2 h-4 w-4 animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
