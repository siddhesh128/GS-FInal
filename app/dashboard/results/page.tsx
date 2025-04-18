import { redirect } from "next/navigation"

import { ExamResults } from "@/components/exam-results"
import { getSession } from "@/lib/auth"
import { getExamResults } from "@/lib/data"

export default async function ResultsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  const results = await getExamResults(session.user.id, session.user.role)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Exam Results</h2>
        <p className="text-muted-foreground">
          {session.user.role === "STUDENT" ? "View your exam results" : "Manage student exam results"}
        </p>
      </div>
      <ExamResults results={results} userRole={session.user.role} />
    </div>
  )
}
