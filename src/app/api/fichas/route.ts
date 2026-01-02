import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fichaSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = fichaSchema.parse(body)

    // Crear ficha en Supabase
    const { data, error } = await supabase
      .from('fichas')
      .insert({
        user_id: user.id,
        nombre: validatedData.nombre,
        ruc: validatedData.ruc || null,
        telefono: validatedData.telefono || null,
        email: validatedData.email || null,
        relacion: validatedData.relacion,
        tipo: validatedData.tipo,
        campos_personalizados: {},
        etapa_ventas: null,
        etapa_postventa: null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Error al crear ficha' },
      { status: 500 }
    )
  }
}
