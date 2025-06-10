import { redirect } from "next/navigation"

import { HallTickets } from "@/components/hall-tickets"
import { getSession } from "@/lib/auth"
import { getHallTickets } from "@/lib/data"

export default async function HallTicketsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "STUDENT") {
    redirect("/dashboard")
  }

  const tickets = await getHallTickets(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Hall Tickets</h2>
        <p className="text-muted-foreground">
          Download your hall tickets for upcoming examinations. Seating arrangements will be available 30 minutes before each exam in the Seating section.
        </p>
      </div>
      <HallTickets tickets={tickets} />
    </div>
  )
}
