import Link from "next/link"
import { Calendar, FileText, MapPin, Users } from "lucide-react"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface DashboardCardsProps {
  role: string
}

export function DashboardCards({ role }: DashboardCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Exams</CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {role === "STUDENT" && "View Upcoming Exams"}
            {role === "FACULTY" && "Invigilation Duties"}
            {role === "ADMIN" && "Manage Exams"}
          </div>
          <p className="text-xs text-muted-foreground">
            {role === "STUDENT" && "Check your exam schedule and details"}
            {role === "FACULTY" && "View your assigned invigilation duties"}
            {role === "ADMIN" && "Create and manage examination schedules"}
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/dashboard/exams" className="text-sm text-primary hover:underline">
            View Exams
          </Link>
        </CardFooter>
      </Card>

      {(role === "STUDENT" || role === "ADMIN") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seating Arrangements</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {role === "STUDENT" && "Your Seating"}
              {role === "ADMIN" && "Manage Seating"}
            </div>
            <p className="text-xs text-muted-foreground">
              {role === "STUDENT" && "Find your assigned seat for each exam"}
              {role === "ADMIN" && "Create and manage seating arrangements"}
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/seating" className="text-sm text-primary hover:underline">
              View Seating
            </Link>
          </CardFooter>
        </Card>
      )}

      {role === "STUDENT" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hall Tickets</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Download Tickets</div>
            <p className="text-xs text-muted-foreground">Download your hall tickets for upcoming exams</p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/hall-tickets" className="text-sm text-primary hover:underline">
              View Hall Tickets
            </Link>
          </CardFooter>
        </Card>
      )}

      {role === "ADMIN" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Management</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Manage Users</div>
            <p className="text-xs text-muted-foreground">Add and manage students and faculty members</p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/users" className="text-sm text-primary hover:underline">
              Manage Users
            </Link>
          </CardFooter>
        </Card>
      )}
    </div>
  )
}
