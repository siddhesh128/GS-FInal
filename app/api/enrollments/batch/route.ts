import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { enrollments } from "@/lib/db/schema"

const batchEnrollmentSchema = z.object({
  examId: z.string().uuid(),
  department: z.string(),
  year: z.enum(["FE", "SE", "TE", "BE"]),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = batchEnrollmentSchema.parse(body)

    // Get all students from the specified department and year
    const students = await db.query.users.findMany({
      where: (users, { eq, and }) => 
        and(
          eq(users.role, "STUDENT"),
          eq(users.department, validatedData.department),
          eq(users.year, validatedData.year)
        ),
    })

    if (students.length === 0) {
      return NextResponse.json({ 
        message: `No students found in ${validatedData.department} department, ${validatedData.year} year` 
      }, { status: 404 })
    }

    // Check if the exam exists
    const exam = await db.query.exams.findFirst({
      where: (exams, { eq }) => eq(exams.id, validatedData.examId),
    })

    if (!exam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 })
    }

    // Create enrollments for all students
    const enrollmentValues = students.map((student) => ({
      examId: validatedData.examId,
      studentId: student.id,
    }))

    // Get existing enrollments to avoid duplicates
    const existingEnrollments = await db.query.enrollments.findMany({
      where: (enrollments, { eq, and, inArray }) => 
        and(
          eq(enrollments.examId, validatedData.examId),
          inArray(
            enrollments.studentId, 
            students.map(s => s.id)
          )
        ),
    })

    // Filter out students that are already enrolled
    const existingStudentIds = new Set(existingEnrollments.map(e => e.studentId))
    const newEnrollmentValues = enrollmentValues.filter(e => !existingStudentIds.has(e.studentId))

    // If all students are already enrolled
    if (newEnrollmentValues.length === 0) {
      return NextResponse.json({ 
        message: `All students from ${validatedData.department} department, ${validatedData.year} year are already enrolled` 
      }, { status: 200 })
    }

    // Batch insert new enrollments
    try {
      await db.insert(enrollments).values(newEnrollmentValues)
    } catch (error) {
      console.error("Error inserting batch enrollments:", error)
      return NextResponse.json({ 
        message: "Some enrollments may have failed. Please check the enrollments list." 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: `Successfully enrolled ${newEnrollmentValues.length} students from ${validatedData.department} department, ${validatedData.year} year`,
      enrolled: newEnrollmentValues.length,
      total: students.length,
      alreadyEnrolled: existingEnrollments.length,
    }, { status: 201 })
  } catch (error) {
    console.error("Error processing batch enrollment:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while processing batch enrollment" }, { status: 500 })
  }
}