import { redirect } from "next/navigation"

import { BuildingsManagement } from "@/components/buildings-management"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function BuildingsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const buildings = await db.query.buildings.findMany({
    orderBy: (buildings, { asc }) => [asc(buildings.name)],
  })

  const rooms = await db.query.rooms.findMany({
    with: {
      building: true,
    },
    orderBy: (rooms, { asc }) => [asc(rooms.roomNumber)],
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Buildings & Rooms Management</h2>
        <p className="text-muted-foreground">Create and manage buildings and rooms for exams</p>
      </div>
      <BuildingsManagement buildings={buildings} rooms={rooms} />
    </div>
  )
}
