import { redirect } from "next/navigation"

import { EnrollmentManager } from "@/components/enrollment-manager"
import { getSession } from "@/lib/auth"
import { getEnrollments } from "@/lib/data"

export default async function EnrollmentsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const enrollments = await getEnrollments()

  // Convert Date objects to strings for type compatibility
  // And create a synthetic id for each enrollment (since our schema uses a composite key)
  const formattedEnrollments = enrollments.map((enrollment) => ({
    ...enrollment,
    // Create a synthetic ID by combining examId and studentId
    id: `${enrollment.examId}_${enrollment.studentId}`,
    exam: {
      ...enrollment.exam,
      // Add courseCode from description for compatibility with the component
      courseCode: enrollment.exam.description || "No Code",
      date: enrollment.exam.date.toISOString(),
    },
    createdAt: enrollment.enrolledAt.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Enrollment Management</h2>
        <p className="text-muted-foreground">Manage student enrollments for exams</p>
      </div>
      <EnrollmentManager enrollments={formattedEnrollments} />
    </div>
  )
}
