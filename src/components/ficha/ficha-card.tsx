"use client"

import { motion } from "framer-motion"
import { User, Mail, Phone, FileText, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"
import type { Ficha } from "@/types"

interface FichaCardProps {
  ficha: Ficha
  onClick: () => void
}

export function FichaCard({ ficha, onClick }: FichaCardProps) {
  const relacionColors = {
    lead: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
    cliente: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
    socio: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    colega: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card border rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-4">
        <Avatar className="h-12 w-12">
          <AvatarFallback className={relacionColors[ficha.relacion]}>
            {getInitials(ficha.nombre)}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-lg">{ficha.nombre}</h3>
            <Badge variant="outline" className="capitalize">
              {ficha.relacion}
            </Badge>
          </div>

          <div className="space-y-1 text-sm">
            {ficha.ruc && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>RUC: {ficha.ruc}</span>
              </div>
            )}
            
            {ficha.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{ficha.email}</span>
              </div>
            )}
            
            {ficha.telefono && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{ficha.telefono}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-shrink-0">
        <Badge 
          variant={ficha.tipo === 'cliente' ? 'default' : 'secondary'}
          className="capitalize"
        >
          {ficha.tipo === 'cliente' ? 'Cliente' : 'Prospecto'}
        </Badge>
      </div>
    </motion.div>
  )
}
