import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams } from "@/lib/db/schema"

const examUpdateSchema = z.object({
  title: z.string().min(2).optional(),
  courseCode: z.string().min(2).optional(),
  date: z.coerce.date().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  location: z.string().min(2).optional(),
})

// GET a single exam by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const exam = await db.query.exams.findFirst({
      where: eq(exams.id, params.id),
    })

    if (!exam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 })
    }

    // For students, check if they're enrolled
    if (session.user.role === "STUDENT") {
      const enrollment = await db.query.enrollments.findFirst({
        where: (enrollments, { and, eq }) =>
          and(eq(enrollments.examId, params.id), eq(enrollments.studentId, session.user.id)),
      })

      if (!enrollment) {
        return NextResponse.json({ message: "You are not enrolled in this exam" }, { status: 403 })
      }
    }

    // For faculty, check if they're the creator
    if (session.user.role === "FACULTY" && exam.createdBy !== session.user.id) {
      return NextResponse.json({ message: "You are not authorized to view this exam" }, { status: 403 })
    }

    return NextResponse.json(exam)
  } catch (error) {
    console.error("Error fetching exam:", error)
    return NextResponse.json({ message: "An error occurred while fetching the exam" }, { status: 500 })
  }
}

// UPDATE an exam
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = examUpdateSchema.parse(body)

    // Check if exam exists
    const existingExam = await db.query.exams.findFirst({
      where: eq(exams.id, params.id),
    })

    if (!existingExam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (validatedData.title) updateData.title = validatedData.title
    if (validatedData.courseCode) updateData.courseCode = validatedData.courseCode
    if (validatedData.date) updateData.date = new Date(validatedData.date)
    if (validatedData.startTime) updateData.startTime = validatedData.startTime
    if (validatedData.endTime) updateData.endTime = validatedData.endTime
    if (validatedData.location) updateData.location = validatedData.location

    updateData.updatedAt = new Date()

    // Update exam
    const updatedExam = await db.update(exams).set(updateData).where(eq(exams.id, params.id)).returning()

    return NextResponse.json(updatedExam[0])
  } catch (error) {
    console.error("Error updating exam:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while updating the exam" }, { status: 500 })
  }
}

// DELETE an exam
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Check if exam exists
    const existingExam = await db.query.exams.findFirst({
      where: eq(exams.id, params.id),
    })

    if (!existingExam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 })
    }

    // Delete exam (cascade will handle related records)
    await db.delete(exams).where(eq(exams.id, params.id))

    return NextResponse.json({ message: "Exam deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting exam:", error)
    return NextResponse.json({ message: "An error occurred while deleting the exam" }, { status: 500 })
  }
}
