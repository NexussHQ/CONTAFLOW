import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DashboardNav } from "@/components/shared/dashboard-nav"
import { UserMenu } from "@/components/shared/user-menu"
import { ModeToggle } from "@/components/shared/mode-toggle"
import { SearchCommand } from "@/components/shared/search-command"
import { MobileNav } from "@/components/shared/mobile-nav"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <DashboardNav />
      <main className="flex-1 overflow-auto">
        <header className="border-b px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileNav />
            <h1 className="text-xl font-semibold">LeadFlow</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <SearchCommand />
            <ModeToggle />
            <UserMenu />
          </div>
        </header>
        <div className="p-4 md:p-6">
          {children}
        </div>
      </main>
    </div>
  )
}

