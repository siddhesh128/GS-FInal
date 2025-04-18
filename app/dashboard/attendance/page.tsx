import { redirect } from "next/navigation"

import { AttendanceMarking } from "@/components/attendance-marking"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function AttendancePage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role === "STUDENT") {
    redirect("/dashboard")
  }

  // For faculty, we'll only show attendance for exams they're assigned to
  // For admin, we'll show all attendance records
  const attendanceRecords = await db.query.attendance.findMany({
    where:
      session.user.role === "FACULTY" ? (attendance, { eq }) => eq(attendance.markedBy, session.user.id) : undefined,
    with: {
      student: true,
      room: {
        with: {
          building: true,
        },
      },
    },
    orderBy: (attendance, { desc }) => [desc(attendance.markedAt)],
    limit: 100, // Limit to recent records
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Attendance Management</h2>
        <p className="text-muted-foreground">
          {session.user.role === "FACULTY"
            ? "Mark attendance for your assigned exams"
            : "Manage attendance for all exams"}
        </p>
      </div>
      <AttendanceMarking initialRecords={attendanceRecords} userRole={session.user.role} />
    </div>
  )
}
