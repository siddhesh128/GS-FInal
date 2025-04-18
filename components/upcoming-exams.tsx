"use client"

import { format } from "date-fns"
import { Calendar, Clock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

interface Exam {
  id: string
  title: string
  courseCode: string
  date: string
  startTime: string
  endTime: string
  location: string
}

interface UpcomingExamsProps {
  exams: Exam[]
  userRole: string
}

export function UpcomingExams({ exams, userRole }: UpcomingExamsProps) {
  // Sort exams by date (closest first)
  const sortedExams = [...exams].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Take only the next 5 exams
  const upcomingExams = sortedExams.slice(0, 5)

  if (upcomingExams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Exams</CardTitle>
          <CardDescription>
            {userRole === "STUDENT"
              ? "Your upcoming exams will appear here"
              : userRole === "FACULTY"
                ? "Your invigilation duties will appear here"
                : "Upcoming exams will appear here"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No upcoming exams</p>
            {userRole === "STUDENT" && (
              <p className="text-sm text-muted-foreground mt-1">Enroll in exams to see them here</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Exams</CardTitle>
        <CardDescription>
          {userRole === "STUDENT"
            ? "Your upcoming exams"
            : userRole === "FACULTY"
              ? "Your invigilation duties"
              : "Recently scheduled exams"}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-4">
          {upcomingExams.map((exam) => (
            <div key={exam.id} className="flex flex-col px-6 py-3 hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="font-semibold">{exam.title}</h3>
                  <p className="text-sm text-muted-foreground">{exam.courseCode}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-1 h-3 w-3" />
                    <span>{format(new Date(exam.date), "MMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Clock className="mr-1 h-3 w-3" />
                    <span>
                      {exam.startTime} - {exam.endTime}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{exam.location}</span>
                {userRole === "STUDENT" && (
                  <Button variant="outline" size="sm" className="h-7 px-2 text-xs">
                    View Details
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/50 px-6 py-3">
        <Button variant="ghost" size="sm" className="ml-auto">
          View All
        </Button>
      </CardFooter>
    </Card>
  )
}
