"use client"

import { format } from "date-fns"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface SeatingData {
  id: string
  examId: string
  studentId: string
  subjectId?: string
  roomId: string
  roomNumber: string
  seatNumber: string
  invigilatorId?: string
  exam: {
    id: string
    title: string
    date: string
    startTime: string
    endTime: string
    location: string
  }
  student?: {
    id: string
    name: string
    email: string
  }
  subject?: {
    id: string
    name: string
    code: string
  } | null
  invigilator?: {
    id: string
    name: string
    email: string
  }
  subjectSchedule?: {
    date: string
    startTime: string
    endTime: string
  } | null
}

interface SeatingArrangementProps {
  data: SeatingData[]
  userRole: string
}

export function SeatingArrangement({ data, userRole }: SeatingArrangementProps) {
  // Function to check if seating details should be visible (30 minutes before exam)
  const isSeatingVisible = (examDate: string | Date, examTime: string) => {
    if (userRole === "ADMIN") return true // Admins can always see seating details
    
    const now = new Date()
    
    // Handle different data types for examDate
    let dateStr: string
    if (typeof examDate === 'string') {
      dateStr = examDate
    } else if (examDate instanceof Date) {
      dateStr = examDate.toISOString()
    } else {
      console.error('Unexpected examDate type:', typeof examDate, examDate)
      return false
    }
    
    // If dateStr is already in ISO format, extract just the date part
    const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
    const examDateTime = new Date(`${dateOnly}T${examTime}`)
    const thirtyMinutesBefore = new Date(examDateTime.getTime() - 30 * 60 * 1000)
    
    return now >= thirtyMinutesBefore
  }

  // Function to check if an exam is expired (past end time)
  const isExamExpired = (examDate: string | Date, examTime: string) => {
    const now = new Date()
    
    let dateStr: string
    if (typeof examDate === 'string') {
      dateStr = examDate
    } else if (examDate instanceof Date) {
      dateStr = examDate.toISOString()
    } else {
      return true // Consider it expired if we can't parse the date
    }
    
    const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
    const examDateTime = new Date(`${dateOnly}T${examTime}`)
    
    return now > examDateTime
  }

  // Function to format the availability time
  const formatAvailabilityTime = (examDate: string, examTime: string) => {
    try {
      const dateOnly = examDate.includes('T') ? examDate.split('T')[0] : examDate
      const examDateTime = new Date(`${dateOnly}T${examTime}`)
      const thirtyMinutesBefore = new Date(examDateTime.getTime() - 30 * 60 * 1000)
      return format(thirtyMinutesBefore, "MMM dd, h:mm a")
    } catch (error) {
      return 'Invalid date'
    }
  }

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No seating arrangements found</h3>
          <p className="text-sm text-muted-foreground">
            {userRole === "ADMIN"
              ? "Use the bulk seating generator to create seating arrangements for all students."
              : "You don't have any seating arrangements assigned yet."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exam</TableHead>
              {userRole === "ADMIN" && <TableHead>Student</TableHead>}
              <TableHead>Subject</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Seat</TableHead>
              <TableHead>Invigilator</TableHead>
              {userRole === "STUDENT" && <TableHead>Status</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data
              .filter((item) => {
                // Don't filter expired exams for admins (they should see all data)
                if (userRole === "ADMIN") return true;
                
                // For students, filter out expired exams
                const examDate = (item.subjectSchedule 
                  ? item.subjectSchedule.date
                  : item.exam.date) as string;
                const examTime = (item.subjectSchedule 
                  ? item.subjectSchedule.endTime  // Use end time to check if exam is completely over
                  : item.exam.endTime) as string;
                
                return !isExamExpired(examDate, examTime);
              })
              .map((item) => {
              const examDate = (item.subjectSchedule 
                ? item.subjectSchedule.date
                : item.exam.date) as string;
              const examTime = (item.subjectSchedule 
                ? item.subjectSchedule.startTime
                : item.exam.startTime) as string;
              const canViewSeating = isSeatingVisible(examDate, examTime);

              return (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.exam.title}</TableCell>
                  {userRole === "ADMIN" && <TableCell>{item.student?.name}</TableCell>}
                  <TableCell>
                    {item.subject ? `${item.subject.name} (${item.subject.code})` : "N/A"}
                  </TableCell>
                  <TableCell>
                    {format(new Date(examDate), "PPP")}
                  </TableCell>
                  <TableCell>
                    {item.subjectSchedule 
                      ? `${item.subjectSchedule.startTime} - ${item.subjectSchedule.endTime}`
                      : `${item.exam.startTime} - ${item.exam.endTime}`}
                  </TableCell>
                  <TableCell>
                    {canViewSeating ? item.roomNumber : "Available 30 min before exam"}
                  </TableCell>
                  <TableCell>
                    {canViewSeating ? item.seatNumber : "Available 30 min before exam"}
                  </TableCell>
                  <TableCell>
                    {canViewSeating 
                      ? (item.invigilator ? item.invigilator.name : "Not assigned")
                      : "Available 30 min before exam"}
                  </TableCell>
                  {userRole === "STUDENT" && (
                    <TableCell>
                      {canViewSeating ? (
                        <span className="text-green-600 font-medium">Seating Available</span>
                      ) : (
                        <span className="text-orange-600 font-medium">
                          Available {formatAvailabilityTime(examDate, examTime)}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
