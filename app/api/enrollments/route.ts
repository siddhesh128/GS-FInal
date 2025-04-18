import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { enrollments } from "@/lib/db/schema"

const enrollmentSchema = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
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
      },
      orderBy: (enrollments, { desc }) => [desc(enrollments.enrolledAt)], // Changed from createdAt to enrolledAt
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
        },
        orderBy: (enrollments, { desc }) => [desc(enrollments.enrolledAt)], // Changed from createdAt to enrolledAt
      })
    }

    const allEnrollments = await query

    return NextResponse.json(allEnrollments)
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

    // Create new enrollment
    const newEnrollment = await db
      .insert(enrollments)
      .values({
        examId: validatedData.examId,
        studentId: validatedData.studentId,
      })
      .returning()

    return NextResponse.json(newEnrollment[0], { status: 201 })
  } catch (error) {
    console.error("Error creating enrollment:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while creating the enrollment" }, { status: 500 })
  }
}
