// Constantes globales para LeadFlow

export const CONTACT_TYPES = {
  lead: { label: 'Prospecto', emoji: '🔴', color: 'red' },
  cliente: { label: 'Cliente', emoji: '🟢', color: 'green' },
  socio: { label: 'Socio', emoji: '🔵', color: 'blue' },
  colega: { label: 'Colega', emoji: '🟣', color: 'purple' }
} as const;

export const PRIORITIES = {
  high: { label: 'Alta', emoji: '🔥', color: 'red' },
  normal: { label: 'Normal', emoji: '', color: 'gray' }
} as const;

export const TASK_STATUS = {
  pending: { label: 'Pendiente', color: 'orange' },
  completed: { label: 'Completada', color: 'green' }
} as const;

export const KANBAN_TYPES = {
  ventas: { label: 'Ventas', icon: '💰' },
  postventa: { label: 'Operaciones', icon: '⚙️' }
} as const;

export const DEFAULT_KANBAN_COLUMNS = {
  ventas: [
    { nombre: 'Por Contactar', posicion: 0, color: '#94a3b8' },
    { nombre: 'En Conversación', posicion: 1, color: '#3b82f6' },
    { nombre: 'Propuesta Enviada', posicion: 2, color: '#f59e0b' },
    { nombre: 'Ganado', posicion: 3, color: '#22c55e' }
  ],
  postventa: [
    { nombre: 'Onboarding', posicion: 0, color: '#8b5cf6' },
    { nombre: 'En Proceso', posicion: 1, color: '#3b82f6' },
    { nombre: 'Por Facturar', posicion: 2, color: '#f59e0b' },
    { nombre: 'Completado', posicion: 3, color: '#22c55e' }
  ]
} as const;

export const CUSTOM_FIELD_TYPES = {
  text: { label: 'Texto', icon: '📝' },
  date: { label: 'Fecha', icon: '📅' },
  number: { label: 'Número', icon: '🔢' },
  select: { label: 'Selección', icon: '📋' }
} as const;

export const APP_NAME = 'LeadFlow';
export const APP_DESCRIPTION = 'Sistema CRM para gestión de ventas y postventa';
