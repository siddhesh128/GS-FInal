import { type NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { attendance } from "@/lib/db/schema"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    let attendanceRecords

    if (session.user.role === "STUDENT") {
      // Students can only see their own attendance
      attendanceRecords = await db.query.attendance.findMany({
        where: (attendance, { eq }) => eq(attendance.studentId, session.user.id),
        with: {
          student: true,
          room: {
            with: {
              building: true,
            },
          },
        },
        orderBy: (attendance, { desc }) => [desc(attendance.markedAt)],
      })
    } else if (session.user.role === "FACULTY") {
      // Faculty can see attendance they've marked
      attendanceRecords = await db.query.attendance.findMany({
        where: (attendance, { eq }) => eq(attendance.markedBy, session.user.id),
        with: {
          student: true,
          room: {
            with: {
              building: true,
            },
          },
        },
        orderBy: (attendance, { desc }) => [desc(attendance.markedAt)],
      })
    } else {
      // Admins can see all attendance
      attendanceRecords = await db.query.attendance.findMany({
        with: {
          student: true,
          room: {
            with: {
              building: true,
            },
          },
        },
        orderBy: (attendance, { desc }) => [desc(attendance.markedAt)],
      })
    }

    return NextResponse.json(attendanceRecords)
  } catch (error) {
    console.error("Error fetching attendance:", error)
    return NextResponse.json({ message: "Failed to fetch attendance records" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || (session.user.role !== "ADMIN" && session.user.role !== "FACULTY")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { examId, subjectId, studentId, roomId, status } = await request.json()

    if (!examId || !subjectId || !studentId || !roomId || !status) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    // Check if attendance already exists for this student, exam, and subject
    const existingAttendance = await db.query.attendance.findFirst({
      where: (attendance, { and, eq }) =>
        and(eq(attendance.examId, examId), eq(attendance.subjectId, subjectId), eq(attendance.studentId, studentId)),
    })

    if (existingAttendance) {
      return NextResponse.json(
        { message: "Attendance already marked for this student in this exam and subject" },
        { status: 400 },
      )
    }

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

    const attendanceWithDetails = await db.query.attendance.findFirst({
      where: (attendance, { eq }) => eq(attendance.id, newAttendance[0].id),
      with: {
        student: true,
        room: {
          with: {
            building: true,
          },
        },
      },
    })

    return NextResponse.json(attendanceWithDetails)
  } catch (error) {
    console.error("Error marking attendance:", error)
    return NextResponse.json({ message: "Failed to mark attendance" }, { status: 500 })
  }
}
