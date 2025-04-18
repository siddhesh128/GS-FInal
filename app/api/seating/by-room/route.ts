import { type NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const examId = searchParams.get("examId")
    const subjectId = searchParams.get("subjectId")
    const roomId = searchParams.get("roomId")

    if (!examId || !roomId) {
      return NextResponse.json({ message: "Exam ID and Room ID are required" }, { status: 400 })
    }

    const seatingArrangements = await db.query.seatingArrangements.findMany({
      where: (seating, { and, eq }) => {
        const conditions = [eq(seating.examId, examId), eq(seating.roomId, roomId)]

        if (subjectId) {
          conditions.push(eq(seating.subjectId, subjectId))
        }

        return and(...conditions)
      },
      with: {
        student: true,
        room: {
          with: {
            building: true,
          },
        },
      },
      orderBy: (seating, { asc }) => [asc(seating.seatNumber)],
    })

    return NextResponse.json(seatingArrangements)
  } catch (error) {
    console.error("Error fetching seating arrangements by room:", error)
    return NextResponse.json({ message: "Failed to fetch seating arrangements" }, { status: 500 })
  }
}
