import type React from "react"
import { redirect } from "next/navigation"
import { Menu } from "lucide-react"

import { DashboardNav } from "@/components/dashboard-nav"
import { MobileNav } from "@/components/mobile-nav"
import { NotificationsPopover } from "@/components/notifications-popover"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { UserNav } from "@/components/user-nav"
import { getSession } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] sm:w-[300px]">
                <div className="px-2 py-6">
                  <MobileNav role={session.user.role} />
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-bold">EMS</h1>
          </div>
          <h1 className="hidden text-xl font-bold md:block">Exam Management System</h1>
          <div className="flex items-center gap-4">
            <NotificationsPopover />
            <ThemeSwitcher />
            <UserNav user={session.user} />
          </div>
        </div>
      </header>
      <div className="container flex-1 items-start md:grid md:grid-cols-[240px_1fr] md:gap-6 md:px-4 lg:grid-cols-[280px_1fr] lg:gap-10">
        <aside className="fixed top-16 z-30 hidden h-[calc(100vh-4rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <DashboardNav role={session.user.role} />
        </aside>
        <main className="flex w-full flex-col overflow-hidden p-4 md:py-6">{children}</main>
      </div>
    </div>
  )
}
