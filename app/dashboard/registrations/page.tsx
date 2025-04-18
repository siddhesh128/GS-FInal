import { redirect } from "next/navigation"

import { PendingRegistrations } from "@/components/pending-registrations"
import { getSession } from "@/lib/auth"
import { getPendingRegistrations } from "@/lib/data"

export default async function RegistrationsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const registrations = await getPendingRegistrations()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Registration Management</h2>
        <p className="text-muted-foreground">Approve or reject student registration requests</p>
      </div>
      <PendingRegistrations registrations={registrations} />
    </div>
  )
}
