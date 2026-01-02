"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { MessageSquare, Phone, Mail, Calendar, FileText, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import type { TimelineEvent } from "@/types"

interface TimelineProps {
  events: TimelineEvent[]
  onAddEvent?: (event: Omit<TimelineEvent, 'id'>) => void
}

const iconMap = {
  nota: MessageSquare,
  llamada: Phone,
  email: Mail,
  reunion: Calendar,
  tarea: FileText,
  sistema: Check,
}

export function Timeline({ events, onAddEvent }: TimelineProps) {
  const [filter, setFilter] = useState<string | null>(null)

  const filteredEvents = filter
    ? events.filter(e => e.tipo === filter)
    : events

  return (
    <div className="space-y-4">
      {/* Filter buttons */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter(null)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
            filter === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          Todos
        </button>
        {Object.entries(iconMap).map(([tipo, Icon]) => (
          <button
            key={tipo}
            onClick={() => setFilter(tipo)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5",
              filter === tipo
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="capitalize">{tipo}</span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {filteredEvents.map((event, index) => {
            const Icon = iconMap[event.tipo]
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className="flex gap-4"
              >
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div
                    className="absolute top-1/2 left-8 w-0.5 h-px bg-border -translate-y-1/2"
                    style={{ width: 'calc(100% + 16px)' }}
                  />
                </div>

                <div className="flex-1 space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.fecha).toLocaleDateString('es-EC', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                  {event.titulo && (
                    <p className="font-semibold text-sm">{event.titulo}</p>
                  )}
                  {event.contenido && (
                    <p className="text-sm text-muted-foreground">
                      {event.contenido}
                    </p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
