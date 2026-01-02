"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    Briefcase,
    FileText,
    Settings,
    LogOut,
    CheckSquare,
    Menu,
    X
} from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/ventas", label: "Ventas", icon: Users },
    { href: "/dashboard/postventa", label: "Post-Venta", icon: Briefcase },
    { href: "/dashboard/fichas", label: "Fichas", icon: FileText },
    { href: "/dashboard/tasks", label: "Tareas", icon: CheckSquare },
    { href: "/dashboard/ajustes", label: "Ajustes", icon: Settings },
]

export function MobileNav() {
    const [open, setOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    const handleLogout = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const handleNavigation = (href: string) => {
        setOpen(false)
        router.push(href)
    }

    return (
        <div className="md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Abrir menú</span>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                    <SheetHeader className="p-6 border-b">
                        <SheetTitle className="text-2xl font-bold text-primary">
                            LeadFlow
                        </SheetTitle>
                    </SheetHeader>
                    <nav className="flex flex-col h-full">
                        <ul className="flex-1 p-4 space-y-1">
                            {navItems.map((item) => {
                                const Icon = item.icon
                                const isActive = pathname === item.href
                                return (
                                    <li key={item.href}>
                                        <button
                                            onClick={() => handleNavigation(item.href)}
                                            className={cn(
                                                "flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors text-left",
                                                isActive
                                                    ? "bg-primary text-primary-foreground"
                                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                            <span className="font-medium">{item.label}</span>
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                        <div className="p-4 border-t">
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                            >
                                <LogOut className="h-5 w-5" />
                                <span className="font-medium">Cerrar sesión</span>
                            </button>
                        </div>
                    </nav>
                </SheetContent>
            </Sheet>
        </div>
    )
}
