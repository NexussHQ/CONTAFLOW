"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { LayoutDashboard, Users, Briefcase, FileText, Settings, LogOut, CheckSquare } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/ventas", label: "Ventas", icon: Users },
  { href: "/dashboard/postventa", label: "Post-Venta", icon: Briefcase },
  { href: "/dashboard/fichas", label: "Fichas", icon: FileText },
  { href: "/dashboard/tasks", label: "Tareas", icon: CheckSquare },
  { href: "/dashboard/ajustes", label: "Ajustes", icon: Settings },
]

export function DashboardNav() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  return (
    <nav className="w-64 border-r bg-background p-4 flex flex-col hidden md:flex">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-primary">LeadFlow</h2>
      </div>
      <ul className="space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
                  pathname === item.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors mt-auto"
      >
        <LogOut className="h-5 w-5" />
        <span>Cerrar sesión</span>
      </button>
    </nav>
  )
}
