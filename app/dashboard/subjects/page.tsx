import { redirect } from "next/navigation"

import { SubjectsManagement } from "@/components/subjects-management"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function SubjectsPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const subjects = await db.query.subjects.findMany({
    orderBy: (subjects, { asc }) => [asc(subjects.name)],
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Subjects Management</h2>
        <p className="text-muted-foreground">Create and manage subjects for exams</p>
      </div>
      <SubjectsManagement subjects={subjects} />
    </div>
  )
}
