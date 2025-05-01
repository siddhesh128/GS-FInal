import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { enrollments, subjectSchedules } from "@/lib/db/schema"

// Schema for subject schedules
const subjectScheduleSchema = z.object({
  subjectId: z.string().uuid(),
  date: z.string().or(z.date()),
  startTime: z.string(),
  endTime: z.string(),
  isDefaultSchedule: z.boolean().optional(),
})

const enrollmentSchema = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  // Added support for subject schedules
  subjectSchedules: z.array(subjectScheduleSchema).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    let query = db.query.enrollments.findMany({
      with: {
        exam: true,
        student: {
          columns: {
            id: true,
            name: true,
            email: true,
          },
        },
        // Include subject schedules in query
        subjectSchedules: {
          with: {
            subject: true,
          },
        },
      },
      orderBy: (enrollments, { desc }) => [desc(enrollments.enrolledAt)],
    })

    // If student, only show their enrollments
    if (session.user.role === "STUDENT") {
      query = db.query.enrollments.findMany({
        where: (enrollments, { eq }) => eq(enrollments.studentId, session.user.id),
        with: {
          exam: true,
          student: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
          // Include subject schedules in query
          subjectSchedules: {
            with: {
              subject: true,
            },
          },
        },
        orderBy: (enrollments, { desc }) => [desc(enrollments.enrolledAt)],
      })
    }

    const allEnrollments = await query

    // Transform to include subject schedule data in a format the frontend expects
    const formattedEnrollments = allEnrollments.map(enrollment => {
      // Get the first subject schedule as default (if any)
      const firstSchedule = enrollment.subjectSchedules && enrollment.subjectSchedules.length > 0
        ? enrollment.subjectSchedules[0]
        : null;

      return {
        ...enrollment,
        subject: firstSchedule?.subject || null,
        subjectSchedule: firstSchedule ? {
          date: firstSchedule.date,
          startTime: firstSchedule.startTime,
          endTime: firstSchedule.endTime,
        } : null,
      };
    });

    return NextResponse.json(formattedEnrollments)
  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return NextResponse.json({ message: "An error occurred while fetching enrollments" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = enrollmentSchema.parse(body)

    // Students can only enroll themselves
    if (session.user.role === "STUDENT" && validatedData.studentId !== session.user.id) {
      return NextResponse.json({ message: "You can only enroll yourself" }, { status: 403 })
    }

    // Check if enrollment already exists
    const existingEnrollment = await db.query.enrollments.findFirst({
      where: (enrollments, { and, eq }) =>
        and(eq(enrollments.examId, validatedData.examId), eq(enrollments.studentId, validatedData.studentId)),
    })

    if (existingEnrollment) {
      return NextResponse.json({ message: "Student is already enrolled in this exam" }, { status: 409 })
    }

    // Start a transaction to ensure atomicity
    const result = await db.transaction(async (tx) => {
      // Create new enrollment
      const newEnrollment = await tx
        .insert(enrollments)
        .values({
          examId: validatedData.examId,
          studentId: validatedData.studentId,
        })
        .returning();
      
      // Add subject schedules if provided
      if (validatedData.subjectSchedules && validatedData.subjectSchedules.length > 0) {
        // Process each schedule individually to avoid type errors
        for (const schedule of validatedData.subjectSchedules) {
          await tx.insert(subjectSchedules).values({
            examId: validatedData.examId,
            enrollmentId: newEnrollment[0].id,
            subjectId: schedule.subjectId,
            date: typeof schedule.date === 'string' ? new Date(schedule.date) : schedule.date,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
          });
        }
      }
      
      return newEnrollment[0];
    });

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error creating enrollment:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while creating the enrollment" }, { status: 500 })
  }
}
