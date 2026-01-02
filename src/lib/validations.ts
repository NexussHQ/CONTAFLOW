import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const registerSchema = z
  .object({
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export const fichaSchema = z.object({
  tipo: z.enum(['prospecto', 'cliente']),
  nombre: z.string().min(2, 'El nombre es requerido'),
  ruc: z.string().regex(/^\d{13}$/, 'El RUC debe tener 13 dígitos').optional().or(z.literal('')),
  telefono: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  relacion: z.enum(['lead', 'cliente', 'socio', 'colega']),
})

export const notaSchema = z.object({
  tipo: z.enum(['nota', 'llamada', 'email', 'reunion', 'tarea']),
  titulo: z.string().optional(),
  contenido: z.string().min(1, 'El contenido es requerido'),
})

// =====================================================
// VALIDACIONES ADICIONALES PARA MVP v2
// =====================================================

export const taskSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().optional(),
  priority: z.enum(['high', 'normal']).default('normal'),
  status: z.enum(['pending', 'completed']).default('pending'),
  due_date: z.string().optional().nullable(),
  due_time: z.string().optional().nullable(),
  ficha_id: z.string().uuid().optional().nullable(),
})

export const customFieldSchema = z.object({
  field_key: z.string()
    .min(1, 'La clave es requerida')
    .regex(/^[a-z_]+$/, 'Solo minúsculas y guiones bajos'),
  field_label: z.string().min(1, 'El nombre es requerido'),
  field_type: z.enum(['text', 'date', 'number', 'select']),
  options: z.array(z.string()).optional(),
  is_required: z.boolean().default(false),
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type FichaInput = z.infer<typeof fichaSchema>
export type NotaInput = z.infer<typeof notaSchema>
export type TaskInput = z.infer<typeof taskSchema>
export type CustomFieldInput = z.infer<typeof customFieldSchema>

