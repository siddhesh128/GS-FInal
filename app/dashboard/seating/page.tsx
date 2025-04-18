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
      
      // Add the roomNumber property and format date as string
      return {
        ...arrangement,
        roomNumber: roomData?.roomNumber || "Unknown",
        exam: {
          ...arrangement.exam,
          // Ensure location is never null to match SeatingData type
          location: arrangement.exam.location || "Not specified",
          date: arrangement.exam.date.toISOString(),
        },
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
              ? "View your assigned seating for upcoming exams"
              : "Manage seating arrangements for all exams"}
          </p>
        </div>
        {session.user.role === "ADMIN" && <BulkSeatingGenerator />}
      </div>
      <SeatingArrangement data={transformedSeatingData} userRole={session.user.role} />
    </div>
  )
}
