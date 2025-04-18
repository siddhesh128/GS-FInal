import { redirect } from "next/navigation"

import { SeatingView } from "@/components/seating-view"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function SeatingViewPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Get all exams for filtering
  const exams = await db.query.exams.findMany({
    orderBy: (exams, { desc }) => [desc(exams.date)],
  })

  // Get all subjects for filtering
  const subjects = await db.query.subjects.findMany({
    orderBy: (subjects, { asc }) => [asc(subjects.name)],
  })

  // Get all buildings for filtering
  const buildings = await db.query.buildings.findMany({
    orderBy: (buildings, { asc }) => [asc(buildings.name)],
  })

  // Get a limited set of seating arrangements for initial view
  const seatingArrangements = await db.query.seatingArrangements.findMany({
    with: {
      exam: true,
      subject: true,
      student: true,
      room: {
        with: {
          building: true,
        },
      },
    },
    orderBy: (seatingArrangements, { desc }) => [desc(seatingArrangements.createdAt)],
    limit: 100, // Limit initial load
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Seating Arrangements View</h2>
        <p className="text-muted-foreground">View and filter all seating arrangements</p>
      </div>
      <SeatingView
        initialSeatingArrangements={seatingArrangements}
        exams={exams}
        subjects={subjects}
        buildings={buildings}
      />
    </div>
  )
}
