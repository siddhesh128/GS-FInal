import { redirect } from "next/navigation"
import { format } from "date-fns"
import { ArrowLeft, Calendar, Clock, MapPin, Users, BookOpen } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

interface ExamDetailsPageProps {
  params: {
    id: string
  }
}

export default async function ExamDetailsPage({ params }: ExamDetailsPageProps) {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  // Get exam details with related data
  const exam = await db.query.exams.findFirst({
    where: (exams, { eq }) => eq(exams.id, params.id),
    with: {
      creator: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  if (!exam) {
    redirect("/dashboard/exams")
  }

  // Get exam subjects
  const examSubjects = await db.query.examSubjects.findMany({
    where: (es, { eq }) => eq(es.examId, params.id),
    with: {
      subject: true,
    },
  })

  // Get subject schedules
  const subjectSchedules = await db.query.subjectSchedules.findMany({
    where: (ss, { eq }) => eq(ss.examId, params.id),
  })

  // Get enrollments count
  const enrollments = await db.query.enrollments.findMany({
    where: (enrollments, { eq }) => eq(enrollments.examId, params.id),
    with: {
      student: {
        columns: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })

  // Get seating arrangements count
  const seatingArrangements = await db.query.seatingArrangements.findMany({
    where: (sa, { eq }) => eq(sa.examId, params.id),
  })

  // Check if user has access to this exam
  if (session.user.role === "STUDENT") {
    const userEnrollment = enrollments.find(e => e.studentId === session.user.id)
    if (!userEnrollment) {
      redirect("/dashboard/exams")
    }
  } else if (session.user.role === "FACULTY") {
    if (exam.createdBy !== session.user.id) {
      redirect("/dashboard/exams")
    }
  }

  const subjects = examSubjects.map(es => es.subject)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/dashboard/exams">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Exams
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{exam.title}</h1>
          <p className="text-muted-foreground">
            {exam.description ? `Course: ${exam.description}` : "Exam Details"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Exam Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3">
              <div>
                <span className="text-sm font-medium text-muted-foreground">Date</span>
                <p className="text-sm">{format(new Date(exam.date), "PPPP")}</p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Time</span>
                <p className="text-sm flex items-center">
                  <Clock className="h-4 w-4 mr-1" />
                  {exam.startTime} - {exam.endTime}
                </p>
              </div>
              <div>
                <span className="text-sm font-medium text-muted-foreground">Location</span>
                <p className="text-sm flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {exam.location}
                </p>
              </div>
              {exam.description && (
                <div>
                  <span className="text-sm font-medium text-muted-foreground">Description</span>
                  <p className="text-sm">{exam.description}</p>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-muted-foreground">Created by</span>
                <p className="text-sm">{exam.creator?.name || "Unknown"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{subjects.length}</div>
                <p className="text-sm text-muted-foreground">Subjects</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{enrollments.length}</div>
                <p className="text-sm text-muted-foreground">Enrolled Students</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{seatingArrangements.length}</div>
                <p className="text-sm text-muted-foreground">Seats Assigned</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {subjectSchedules.length > 0 ? "Yes" : "No"}
                </div>
                <p className="text-sm text-muted-foreground">Custom Schedules</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BookOpen className="h-5 w-5 mr-2" />
            Subjects ({subjects.length})
          </CardTitle>
          <CardDescription>
            {subjectSchedules.length > 0 
              ? "This exam has subject-specific schedules"
              : "All subjects follow the main exam schedule"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No subjects assigned to this exam.</p>
          ) : (
            <div className="space-y-4">
              {subjects.map((subject) => {
                const schedule = subjectSchedules.find(s => s.subjectId === subject.id)
                return (
                  <div key={subject.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{subject.name}</h3>
                        <p className="text-sm text-muted-foreground">Code: {subject.code}</p>
                        {subject.description && (
                          <p className="text-sm text-muted-foreground mt-1">{subject.description}</p>
                        )}
                      </div>
                      {schedule && (
                        <Badge variant="secondary">Custom Schedule</Badge>
                      )}
                    </div>
                    {schedule && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Date:</span>
                            <p className="text-muted-foreground">{format(new Date(schedule.date), "PPP")}</p>
                          </div>
                          <div>
                            <span className="font-medium">Start Time:</span>
                            <p className="text-muted-foreground">{schedule.startTime}</p>
                          </div>
                          <div>
                            <span className="font-medium">End Time:</span>
                            <p className="text-muted-foreground">{schedule.endTime}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enrolled Students (Admin only) */}
      {session.user.role === "ADMIN" && enrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Enrolled Students ({enrollments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {enrollments.map((enrollment) => (
                <div key={enrollment.id} className="flex items-center justify-between p-2 border rounded">
                  <div>
                    <p className="font-medium">{enrollment.student.name}</p>
                    <p className="text-sm text-muted-foreground">{enrollment.student.email}</p>
                  </div>
                  <Badge variant="outline">
                    Enrolled on {format(new Date(enrollment.enrolledAt), "PPP")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
