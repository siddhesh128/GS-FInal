import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { seatingArrangements } from "@/lib/db/schema"

const seatingSchema = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  roomId: z.string().uuid(),
  seatNumber: z.string(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    let seatingData

    if (session.user.role === "ADMIN") {
      // Admins can see all seating arrangements
      seatingData = await db.query.seatingArrangements.findMany({
        with: {
          exam: true,
          subject: true,
          student: {
            columns: {
              password: false,
            },
          },
          invigilator: {
            columns: {
              id: true,
              name: true,
              email: true,
            }
          },
          room: {
            with: {
              building: true,
            },
          },
        },
      })
    } else if (session.user.role === "STUDENT") {
      // Students can only see their own seating arrangements
      seatingData = await db.query.seatingArrangements.findMany({
        where: (seatingArrangements, { eq }) => eq(seatingArrangements.studentId, session.user.id),
        with: {
          exam: true,
          subject: true,
          invigilator: {
            columns: {
              id: true,
              name: true,
              email: true,
            }
          },
          room: {
            with: {
              building: true,
            },
          },
        },
      })
    } else if (session.user.role === "FACULTY") {
      // Faculty can see arrangements where they are invigilators
      seatingData = await db.query.seatingArrangements.findMany({
        where: (seatingArrangements, { eq }) => eq(seatingArrangements.invigilatorId, session.user.id),
        with: {
          exam: true,
          subject: true,
          student: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          room: {
            with: {
              building: true,
            },
          },
        },
      })
    }
    
    // If we have seating arrangements, fetch subject-specific schedules
    if (seatingData && seatingData.length > 0) {
      // Get unique exam and subject IDs
      const examIds = [...new Set(seatingData.map(sa => sa.examId))];
      const subjectIds = [...new Set(seatingData.filter(sa => sa.subjectId).map(sa => sa.subjectId as string))];
      
      // Fetch all relevant subject schedules in a single query
      const subjectSchedules = await db.query.subjectSchedules.findMany({
        where: (ss, { and, inArray }) => {
          const conditions = [];
          if (examIds.length) conditions.push(inArray(ss.examId, examIds));
          if (subjectIds.length) conditions.push(inArray(ss.subjectId, subjectIds));
          return and(...conditions);
        }
      });
      
      // Map subject schedules to seating arrangements
      seatingData = seatingData.map(arrangement => {
        if (arrangement.subjectId) {
          const schedule = subjectSchedules.find(
            ss => ss.examId === arrangement.examId && ss.subjectId === arrangement.subjectId
          );
          
          if (schedule) {
            return {
              ...arrangement,
              subjectSchedule: {
                date: schedule.date,
                startTime: schedule.startTime,
                endTime: schedule.endTime
              }
            };
          }
        }
        return arrangement;
      });
    }

    return NextResponse.json(seatingData)
  } catch (error) {
    console.error("Error fetching seating arrangements:", error)
    return NextResponse.json({ message: "An error occurred while fetching seating arrangements" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = seatingSchema.parse(body)

    // Check if seating arrangement already exists
    const existingSeating = await db.query.seatingArrangements.findFirst({
      where: (seatingArrangements, { and, eq }) =>
        and(
          eq(seatingArrangements.examId, validatedData.examId),
          eq(seatingArrangements.studentId, validatedData.studentId),
        ),
    })

    if (existingSeating) {
      return NextResponse.json(
        { message: "Seating arrangement already exists for this student and exam" },
        { status: 409 },
      )
    }

    // Create new seating arrangement
    const newSeating = await db
      .insert(seatingArrangements)
      .values({
        examId: validatedData.examId,
        studentId: validatedData.studentId,
        roomId: validatedData.roomId,
        seatNumber: validatedData.seatNumber,
      })
      .returning()

    return NextResponse.json(newSeating[0], { status: 201 })
  } catch (error) {
    console.error("Error creating seating arrangement:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while creating the seating arrangement" }, { status: 500 })
  }
}
