"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { PlusCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

interface Student {
  id: string
  name: string
  email: string
}

interface Exam {
  id: string
  title: string
  date: string
}

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
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [exams, setExams] = useState<Exam[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [newSeating, setNewSeating] = useState({
    examId: "",
    studentId: "",
    roomNumber: "",
    seatNumber: "",
  })

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

  // Fetch exams and students for seating assignment
  useEffect(() => {
    if (userRole === "ADMIN" && open) {
      const fetchExamsAndStudents = async () => {
        try {
          // Fetch exams
          const examsResponse = await fetch("/api/exams")
          if (!examsResponse.ok) {
            throw new Error("Failed to fetch exams")
          }
          const examsData = await examsResponse.json()
          setExams(examsData)

          // Fetch students
          const studentsResponse = await fetch("/api/users?role=STUDENT")
          if (!studentsResponse.ok) {
            throw new Error("Failed to fetch students")
          }
          const studentsData = await studentsResponse.json()
          setStudents(studentsData)
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load data for seating assignment",
          })
        }
      }

      fetchExamsAndStudents()
    }
  }, [open, userRole, toast])

  const handleCreateSeating = async () => {
    if (!newSeating.examId || !newSeating.studentId || !newSeating.roomNumber || !newSeating.seatNumber) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/seating", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSeating),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to create seating arrangement")
      }

      toast({
        title: "Seating arrangement created",
        description: "The seating arrangement has been created successfully",
      })

      setOpen(false)
      setNewSeating({
        examId: "",
        studentId: "",
        roomNumber: "",
        seatNumber: "",
      })
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create seating arrangement",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewSeating((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setNewSeating((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-4">
      {userRole === "ADMIN" && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Seating Arrangement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Seating Arrangement</DialogTitle>
                <DialogDescription>Assign a seat to a student for an exam</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="examId" className="text-right">
                    Exam
                  </Label>
                  <Select onValueChange={(value) => handleSelectChange("examId", value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id}>
                          {exam.title} - {format(new Date(exam.date), "PPP")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="studentId" className="text-right">
                    Student
                  </Label>
                  <Select onValueChange={(value) => handleSelectChange("studentId", value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} - {student.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roomNumber" className="text-right">
                    Room Number
                  </Label>
                  <Input
                    id="roomNumber"
                    name="roomNumber"
                    value={newSeating.roomNumber}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="seatNumber" className="text-right">
                    Seat Number
                  </Label>
                  <Input
                    id="seatNumber"
                    name="seatNumber"
                    value={newSeating.seatNumber}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateSeating} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Seating"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {data.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No seating arrangements found</h3>
          <p className="text-sm text-muted-foreground">
            {userRole === "ADMIN"
              ? "Create your first seating arrangement by clicking the button above."
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
