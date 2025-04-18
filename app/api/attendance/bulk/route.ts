import { type NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { attendance } from "@/lib/db/schema"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "FACULTY")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { examId, subjectId, roomId, attendanceData } = await request.json()

    if (!examId || !subjectId || !roomId || !attendanceData || !Array.isArray(attendanceData)) {
      return NextResponse.json({ message: "Invalid request data" }, { status: 400 })
    }

    // Process each attendance record
    const results = []
    for (const record of attendanceData) {
      const { studentId, status } = record

      // Check if attendance already exists for this student, exam, and subject
      const existingAttendance = await db.query.attendance.findFirst({
        where: (attendance, { and, eq }) =>
          and(eq(attendance.examId, examId), eq(attendance.subjectId, subjectId), eq(attendance.studentId, studentId)),
      })

      if (!existingAttendance) {
        const newAttendance = await db
          .insert(attendance)
          .values({
            examId,
            subjectId,
            studentId,
            roomId,
            status,
            markedBy: session.user.id,
            markedAt: new Date(),
          })
          .returning()

        results.push(newAttendance[0])
      }
    }

    return NextResponse.json({ count: results.length, message: "Bulk attendance marked successfully" })
  } catch (error) {
    console.error("Error marking bulk attendance:", error)
    return NextResponse.json({ message: "Failed to mark bulk attendance" }, { status: 500 })
  }
}
