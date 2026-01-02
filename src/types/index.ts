export type TipoFicha = 'prospecto' | 'cliente'
export type RelacionFicha = 'lead' | 'cliente' | 'socio' | 'colega'
export type TipoKanban = 'ventas' | 'postventa'

export interface Ficha {
  id: string
  user_id: string
  tipo: TipoFicha
  nombre: string
  ruc?: string
  telefono?: string
  email?: string
  relacion: RelacionFicha
  campos_personalizados: Record<string, any>
  etapa_ventas?: string
  etapa_postventa?: string
  creado_at: string
  actualizado_at: string
}

export interface ColumnaKanban {
  id: string
  user_id: string
  tipo: TipoKanban
  nombre: string
  posicion: number
  color: string
}

export interface TimelineEvent {
  id: string
  ficha_id: string
  user_id: string
  tipo: 'nota' | 'llamada' | 'email' | 'reunion' | 'tarea' | 'sistema'
  titulo?: string
  contenido?: string
  fecha: string
}

export interface Etiqueta {
  id: string
  user_id: string
  nombre: string
  color: string
}

export interface ColumnasKanbanDefault {
  ventas: Array<{ nombre: string; color: string }>
  postventa: Array<{ nombre: string; color: string }>
}

export const COLUMNAS_DEFAULT: ColumnasKanbanDefault = {
  ventas: [
    { nombre: 'Por Contactar', color: '#6366f1' },
    { nombre: 'Conversación', color: '#8b5cf6' },
    { nombre: 'Propuesta', color: '#a855f7' },
    { nombre: 'Ganado', color: '#22c55e' },
  ],
  postventa: [
    { nombre: 'Onboarding', color: '#6366f1' },
    { nombre: 'En Proceso', color: '#3b82f6' },
    { nombre: 'Por Facturar', color: '#f59e0b' },
    { nombre: 'Archivado', color: '#6b7280' },
  ],
}

// =====================================================
// TIPOS ADICIONALES PARA MVP v2
// =====================================================

export type TaskPriority = 'high' | 'normal'
export type TaskStatus = 'pending' | 'completed'

export interface Task {
  id: string
  user_id: string
  ficha_id?: string | null
  title: string
  description?: string | null
  priority: TaskPriority
  status: TaskStatus
  due_date?: string | null
  due_time?: string | null
  created_at: string
  completed_at?: string | null
  // Relación opcional con ficha
  fichas?: {
    id: string
    nombre: string
    tipo?: string
  }
  // Subtareas de la tarea
  subtasks?: Subtask[]
}

export interface Subtask {
  id: string
  task_id: string
  title: string
  description?: string | null
  completed: boolean
  order_index: number
  created_at: string
  completed_at?: string | null
}

export interface Profile {
  id: string
  full_name?: string
  avatar_url?: string
  company_name?: string
  created_at: string
  updated_at: string
}

export type CustomFieldType = 'text' | 'date' | 'number' | 'select'

export interface CustomFieldDefinition {
  id: string
  user_id: string
  field_key: string
  field_label: string
  field_type: CustomFieldType
  options?: string[] | null
  is_required: boolean
  position: number
  created_at: string
}

