import Link from "next/link"
import { ArrowRight, BarChart3, Users, Zap } from "lucide-react"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              LeadFlow
            </h1>
            <p className="text-xl text-muted-foreground">
              CRM minimalista para profesionales de servicios
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Gestión comercial y operativa unificada. Sin fricción, con inteligencia artificial.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Comenzar ahora
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-8 py-3 border border-input bg-background hover:bg-secondary transition-colors rounded-lg font-medium"
            >
              Crear cuenta
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mx-auto">
                <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="font-semibold">Fichas Maestras</h3>
              <p className="text-sm text-muted-foreground">
                Gestiona prospectos y clientes con campos personalizados
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto">
                <BarChart3 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="font-semibold">Kanban Dual</h3>
              <p className="text-sm text-muted-foreground">
                Paneles de ventas y post-venta en tiempo real
              </p>
            </div>

            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto">
                <Zap className="w-6 h-6 text-pink-600 dark:text-pink-400" />
              </div>
              <h3 className="font-semibold">Voice AI</h3>
              <p className="text-sm text-muted-foreground">
                Controla todo con comandos de voz
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
