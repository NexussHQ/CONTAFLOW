"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { loginSchema, type LoginInput } from "@/lib/validations"
import { DEMO_USER } from "@/lib/demo"

const DEMO_MODE = true

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  useEffect(() => {
    setMounted(true)
    if (DEMO_MODE) {
      const session = localStorage.getItem("demo_session")
      if (session) {
        router.replace("/dashboard")
      }
    }
  }, [router])

  const onSubmit = async (data: LoginInput) => {
    setLoading(true)
    
    if (DEMO_MODE) {
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (data.email === DEMO_USER.email && data.password === DEMO_USER.password) {
        localStorage.setItem("demo_session", JSON.stringify({
          user: DEMO_USER,
          expires: Date.now() + (7 * 24 * 60 * 60 * 1000)
        }))
        
        toast({
          title: "Modo Demo",
          description: "Sesión iniciada en modo demo",
        })
        router.push("/dashboard")
      } else {
        toast({
          variant: "destructive",
          title: "Credenciales incorrectas",
          description: "Usa las credenciales de demo o regístrate para una cuenta real",
        })
      }
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast({
        variant: "destructive",
        title: "Error al iniciar sesión",
        description: error.message,
      })
    } else {
      router.push("/dashboard")
      router.refresh()
    }
    setLoading(false)
  }

  if (!mounted) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Iniciar Sesión</CardTitle>
        <CardDescription>
          {DEMO_MODE ? "Modo Demo - Usa las credenciales de abajo" : "Ingresa tus credenciales para acceder a LeadFlow"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {DEMO_MODE && (
          <div className="mb-4 p-3 bg-muted rounded-lg text-sm">
            <p className="font-medium mb-1">Credenciales Demo:</p>
            <p>Email: <code className="bg-muted-foreground/20 px-1 rounded">{DEMO_USER.email}</code></p>
            <p>Contraseña: <code className="bg-muted-foreground/20 px-1 rounded">{DEMO_USER.password}</code></p>
          </div>
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              defaultValue={DEMO_MODE ? DEMO_USER.email : ""}
              {...register("email")}
              disabled={loading}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              defaultValue={DEMO_MODE ? DEMO_USER.password : ""}
              {...register("password")}
              disabled={loading}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Iniciando...
              </>
            ) : (
              DEMO_MODE ? "Entrar en Modo Demo" : "Iniciar Sesión"
            )}
          </Button>

          {!DEMO_MODE && (
            <p className="text-center text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link href="/register" className="text-primary hover:underline">
                Regístrate
              </Link>
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  )
}
