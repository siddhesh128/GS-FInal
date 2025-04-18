import { redirect } from "next/navigation"
import { CalendarDays, GraduationCap, School, Users } from "lucide-react"

import { DashboardAnalytics } from "@/components/dashboard-analytics"
import { PendingRegistrations } from "@/components/pending-registrations"
import { RecentActivity } from "@/components/recent-activity"
import { SeedDatabase } from "@/components/seed-database"
import { UpcomingExams } from "@/components/upcoming-exams"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSession } from "@/lib/auth"
import { getAnalyticsData, getPendingRegistrations, getRecentActivity, getUpcomingExams } from "@/lib/data"

export default async function DashboardPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  // For admin dashboard, get analytics data and pending registrations
  let analyticsData = null
  let pendingRegistrations = []
  let recentActivity = []
  let upcomingExams = []

  if (session.user.role === "ADMIN") {
    analyticsData = await getAnalyticsData()
    pendingRegistrations = await getPendingRegistrations()
    recentActivity = await getRecentActivity()
  }

  upcomingExams = await getUpcomingExams(session.user.id, session.user.role)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, {session.user.name}!</h2>
          <p className="text-muted-foreground mt-1">Here's an overview of your examination portal</p>
        </div>
        {session.user.role === "ADMIN" && (
          <div className="flex items-center gap-2">
            <SeedDatabase />
          </div>
        )}
      </div>

      {/* Quick Stats for all users */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {session.user.role === "ADMIN" && analyticsData && (
          <>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                <GraduationCap className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalStudents}</div>
                <p className="text-xs text-muted-foreground mt-1">Registered students in the system</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Faculty</CardTitle>
                <Users className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalFaculty}</div>
                <p className="text-xs text-muted-foreground mt-1">Faculty members in the system</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
                <School className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalExams}</div>
                <p className="text-xs text-muted-foreground mt-1">Scheduled exams in the system</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 border-amber-200 dark:border-amber-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                <CalendarDays className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analyticsData.totalEnrollments}</div>
                <p className="text-xs text-muted-foreground mt-1">Student exam enrollments</p>
              </CardContent>
            </Card>
          </>
        )}

        {session.user.role !== "ADMIN" && (
          <>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">Upcoming Exams</CardTitle>
                <CalendarDays className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{upcomingExams.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {session.user.role === "STUDENT" ? "Enrolled exams" : "Assigned exams"}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Left column - 4/7 width on large screens */}
        <div className="space-y-6 lg:col-span-4">
          {session.user.role === "ADMIN" && analyticsData && <DashboardAnalytics data={analyticsData} />}

          {/* Upcoming exams for all users */}
          <UpcomingExams exams={upcomingExams} userRole={session.user.role} />
        </div>

        {/* Right column - 3/7 width on large screens */}
        <div className="space-y-6 lg:col-span-3">
          {/* Pending registrations for admin */}
          {session.user.role === "ADMIN" && pendingRegistrations.length > 0 && (
            <PendingRegistrations registrations={pendingRegistrations} />
          )}

          {/* Recent activity for all users */}
          <RecentActivity activities={recentActivity} userRole={session.user.role} />
        </div>
      </div>
    </div>
  )
}
