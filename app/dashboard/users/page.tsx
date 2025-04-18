import { redirect } from "next/navigation"

import { UserManagement } from "@/components/user-management"
import { getSession } from "@/lib/auth"
import { getAllUsers } from "@/lib/data"

export default async function UsersPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const users = await getAllUsers()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">Add, edit, and manage students and faculty members</p>
      </div>
      <UserManagement users={users} />
    </div>
  )
}
