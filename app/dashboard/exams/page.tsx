import { redirect } from "next/navigation"

import { ExamsList } from "@/components/exams-list"
import { getSession } from "@/lib/auth"
import { getExams } from "@/lib/data"

export default async function ExamsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const exams = await getExams(session.user.id, session.user.role)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Exams</h2>
        <p className="text-muted-foreground">
          {session.user.role === "STUDENT"
            ? "View and enroll in upcoming exams"
            : session.user.role === "FACULTY"
              ? "View your assigned invigilation duties"
              : "Manage all examinations"}
        </p>
      </div>
      <ExamsList exams={exams} userRole={session.user.role} />
    </div>
  )
}
