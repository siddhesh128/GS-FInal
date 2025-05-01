import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { seatingArrangements } from "@/lib/db/schema"

const seatingUpdateSchema = z.object({
  roomNumber: z.string().min(1).optional(),
  seatNumber: z.string().min(1).optional(),
})

// GET a single seating arrangement by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const seating = await db.query.seatingArrangements.findFirst({
      where: eq(seatingArrangements.id, params.id),
      with: {
        exam: true,
        subject: true,
        student:
          session.user.role === "ADMIN"
            ? {
                columns: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              }
            : undefined,
        invigilator: {
          columns: {
            id: true,
            name: true,
            email: true,
          }
        },
        room: {
          with: {
            building: true
          }
        }
      },
    })

    if (!seating) {
      return NextResponse.json({ message: "Seating arrangement not found" }, { status: 404 })
    }

    // Students can only view their own seating arrangements
    if (session.user.role === "STUDENT" && seating.studentId !== session.user.id) {
      return NextResponse.json({ message: "You can only view your own seating arrangements" }, { status: 403 })
    }
    
    // Get subject schedule if available
    let subjectSchedule = null;
    if (seating.subjectId) {
      subjectSchedule = await db.query.subjectSchedules.findFirst({
        where: (ss, { and, eq }) => 
          and(eq(ss.examId, seating.examId), eq(ss.subjectId, seating.subjectId as string)),
      });
    }
    
    // Add subject schedule to the response
    const enrichedSeating = {
      ...seating,
      subjectSchedule: subjectSchedule ? {
        date: subjectSchedule.date,
        startTime: subjectSchedule.startTime,
        endTime: subjectSchedule.endTime
      } : null
    };

    return NextResponse.json(enrichedSeating)
  } catch (error) {
    console.error("Error fetching seating arrangement:", error)
    return NextResponse.json({ message: "An error occurred while fetching the seating arrangement" }, { status: 500 })
  }
}

// UPDATE a seating arrangement
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = seatingUpdateSchema.parse(body)

    // Check if seating arrangement exists
    const existingSeating = await db.query.seatingArrangements.findFirst({
      where: eq(seatingArrangements.id, params.id),
    })

    if (!existingSeating) {
      return NextResponse.json({ message: "Seating arrangement not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (validatedData.roomNumber) updateData.roomNumber = validatedData.roomNumber
    if (validatedData.seatNumber) updateData.seatNumber = validatedData.seatNumber

    // Update seating arrangement
    const updatedSeating = await db
      .update(seatingArrangements)
      .set(updateData)
      .where(eq(seatingArrangements.id, params.id))
      .returning()

    return NextResponse.json(updatedSeating[0])
  } catch (error) {
    console.error("Error updating seating arrangement:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while updating the seating arrangement" }, { status: 500 })
  }
}

// DELETE a seating arrangement
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Check if seating arrangement exists
    const existingSeating = await db.query.seatingArrangements.findFirst({
      where: eq(seatingArrangements.id, params.id),
    })

    if (!existingSeating) {
      return NextResponse.json({ message: "Seating arrangement not found" }, { status: 404 })
    }

    // Delete seating arrangement
    await db.delete(seatingArrangements).where(eq(seatingArrangements.id, params.id))

    return NextResponse.json({ message: "Seating arrangement deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting seating arrangement:", error)
    return NextResponse.json({ message: "An error occurred while deleting the seating arrangement" }, { status: 500 })
  }
}
