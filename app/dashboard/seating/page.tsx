import { redirect } from "next/navigation"

import { BulkSeatingGenerator } from "@/components/bulk-seating-generator"
import { SeatingArrangement } from "@/components/seating-arrangement"
import { getSession } from "@/lib/auth"
import { getSeatingArrangements } from "@/lib/data"
import { db } from "@/lib/db"

export default async function SeatingPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role === "FACULTY") {
    redirect("/dashboard")
  }

  const seatingData = await getSeatingArrangements(session.user.id, session.user.role)
  
  // Transform the seating data to include roomNumber from the rooms table
  const transformedSeatingData = await Promise.all(
    seatingData.map(async (arrangement) => {
      // Get the room data for this seating arrangement
      const roomData = await db.query.rooms.findFirst({
        where: (rooms, { eq }) => eq(rooms.id, arrangement.roomId),
      })
      
      // Get invigilator data if available
      let invigilatorData = null
      if (arrangement.invigilatorId) {
        invigilatorData = await db.query.users.findFirst({
          where: (users, { eq }) => eq(users.id, arrangement.invigilatorId as string),
          columns: {
            id: true,
            name: true,
            email: true
          },
        })
      }
      
      // Add the roomNumber property and format date as string
      return {
        ...arrangement,
        roomNumber: roomData?.roomNumber || "Unknown",
        invigilator: invigilatorData ?? undefined, // Map null to undefined
        invigilatorId: arrangement.invigilatorId ?? undefined, // Map null to undefined
        subjectId: arrangement.subjectId ?? undefined, // Map null to undefined
        exam: {
          ...arrangement.exam,
          // Ensure location is never null to match SeatingData type
          location: arrangement.exam.location || "Not specified",
          date: arrangement.exam.date.toISOString(),
        },
        subjectSchedule: arrangement.subjectSchedule ? {
          ...arrangement.subjectSchedule,
          date: arrangement.subjectSchedule.date.toISOString(),
        } : arrangement.subjectSchedule,
        createdAt: arrangement.createdAt.toISOString(),
        updatedAt: arrangement.updatedAt.toISOString(),
      }
    })
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Seating Arrangements</h2>
          <p className="text-muted-foreground">
            {session.user.role === "STUDENT"
              ? "View your assigned seating for upcoming exams. Seating details are available 30 minutes before each exam."
              : "Manage seating arrangements for all exams"}
          </p>
        </div>
        {session.user.role === "ADMIN" && <BulkSeatingGenerator />}
      </div>
      <SeatingArrangement data={transformedSeatingData} userRole={session.user.role} />
    </div>
  )
}
