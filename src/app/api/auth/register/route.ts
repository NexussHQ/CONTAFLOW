import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nombre } = registerSchema.parse(body)

    const supabase = createClient()

    // Paso 1: Crear el usuario en auth.users
    console.log("Intentando crear usuario con email:", email)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre,
        },
      },
    })

    console.log("Auth Response:", { authData, authError })

    if (authError) {
      console.error("Error de autenticación:", authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      console.error("No se creó el usuario")
      return NextResponse.json(
        { error: "Error al crear el usuario" },
        { status: 500 }
      )
    }

    const userId = authData.user.id
    console.log("Usuario creado con ID:", userId)

    // Paso 2: Crear el perfil y las columnas Kanban usando la función RPC
    // Esta función tiene SECURITY DEFINER, por lo que puede insertar
    // incluso si el usuario no está confirmado
    try {
      console.log("Intentando llamar a RPC create_user_profile_and_columns")
      const { data: rpcData, error: rpcError } = await supabase.rpc(
        "create_user_profile_and_columns",
        {
          p_user_id: userId,
          p_nombre: nombre,
        }
      )

      console.log("RPC Response:", { rpcData, rpcError })

      if (rpcError) {
        console.error("Error al crear el perfil y las columnas Kanban:", rpcError)
        // No retornamos error aquí porque el usuario ya fue creado
        // El usuario podrá acceder al sistema después de confirmar su email
      } else {
        console.log("Perfil y columnas Kanban creados exitosamente")
      }
    } catch (rpcException) {
      console.error("Excepción al llamar RPC:", rpcException)
      // No retornamos error aquí porque el usuario ya fue creado
    }

    // Retornar éxito indicando que el usuario debe confirmar su email
    return NextResponse.json({
      message: "Registro exitoso. Por favor verifica tu email para confirmar la cuenta.",
      requiresEmailConfirmation: true,
    }, { status: 201 })

  } catch (error) {
    console.error("Error en el registro:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos de registro inválidos", details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    )
  }
}
