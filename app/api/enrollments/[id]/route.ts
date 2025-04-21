import { type NextRequest, NextResponse } from "next/server"
import { eq, and } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { enrollments } from "@/lib/db/schema"

// Helper to parse composite key from params.id
function parseEnrollmentId(id: string) {
  const [examId, studentId] = id.split("_")
  return { examId, studentId }
}

// GET a single enrollment by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const { examId, studentId } = parseEnrollmentId(params.id)

    const enrollment = await db.query.enrollments.findFirst({
      where: (enrollments, { eq, and }) => and(eq(enrollments.examId, examId), eq(enrollments.studentId, studentId)),
      with: {
        exam: true,
        student: {
          columns: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    })

    if (!enrollment) {
      return NextResponse.json({ message: "Enrollment not found" }, { status: 404 })
    }

    // Students can only view their own enrollments
    if (session.user.role === "STUDENT" && enrollment.studentId !== session.user.id) {
      return NextResponse.json({ message: "You can only view your own enrollments" }, { status: 403 })
    }

    return NextResponse.json(enrollment)
  } catch (error) {
    console.error("Error fetching enrollment:", error)
    return NextResponse.json({ message: "An error occurred while fetching the enrollment" }, { status: 500 })
  }
}

// DELETE an enrollment
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const { examId, studentId } = parseEnrollmentId(params.id)

    // Get the enrollment
    const enrollment = await db.query.enrollments.findFirst({
      where: (enrollments, { eq, and }) => and(eq(enrollments.examId, examId), eq(enrollments.studentId, studentId)),
    })

    if (!enrollment) {
      return NextResponse.json({ message: "Enrollment not found" }, { status: 404 })
    }

    // Students can only delete their own enrollments
    if (session.user.role === "STUDENT" && enrollment.studentId !== session.user.id) {
      return NextResponse.json({ message: "You can only delete your own enrollments" }, { status: 403 })
    }

    // Only admins and the enrolled student can delete enrollments
    if (session.user.role !== "ADMIN" && session.user.id !== enrollment.studentId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Delete enrollment
    await db.delete(enrollments).where(
      and(
        eq(enrollments.examId, examId),
        eq(enrollments.studentId, studentId)
      )
    )

    return NextResponse.json({ message: "Enrollment deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting enrollment:", error)
    return NextResponse.json({ message: "An error occurred while deleting the enrollment" }, { status: 500 })
  }
}
