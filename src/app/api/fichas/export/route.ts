import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    )
  }

  const { data: fichas } = await supabase
    .from('fichas')
    .select('*')
    .eq('user_id', user.id)
    .order('creado_at', { ascending: false })

  if (!fichas) {
    return NextResponse.json(
      { error: 'No hay fichas' },
      { status: 404 }
    )
  }

  const csv = [
    'id',
    'tipo',
    'relacion',
    'nombre',
    'ruc',
    'telefono',
    'email',
    'creado_at',
  ]

  const csvData = fichas.map(f => ({
    id: f.id,
    tipo: f.tipo,
    relacion: f.relacion,
    nombre: f.nombre,
    ruc: f.ruc || '',
    telefono: f.telefono || '',
    email: f.email || '',
    creado_at: f.creado_at,
  }))

  const csvContent = csvData.map(row =>
    csv.map((field, index) => {
      const value = row[field as keyof typeof row] || ''
      return `"${value}"`
    }).join(',')
  ).join('\n')

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename=fichas-leadflow.csv',
    },
  })
}
