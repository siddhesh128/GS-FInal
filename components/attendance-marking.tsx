"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { CheckCircle, PlusCircle, Search, XCircle } from "lucide-react"

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

interface Student {
  id: string
  name: string
  email: string
}

interface Exam {
  id: string
  title: string
  date: string
  subjects?: {
    id: string
    name: string
    code: string
  }[]
}

interface Room {
  id: string
  roomNumber: string
  buildingId: string
  floor: string
  capacity: string
  building?: {
    name: string
    number: string
  }
}

interface AttendanceRecord {
  id: string
  examId: string
  subjectId: string
  studentId: string
  roomId: string
  status: "PRESENT" | "ABSENT" | "LATE"
  markedAt: string
  markedBy: string
  student: {
    id: string
    name: string
    email: string
  }
  room: {
    id: string
    roomNumber: string
    building: {
      id: string
      name: string
      number: string
    }
  }
}

interface AttendanceMarkingProps {
  initialRecords: AttendanceRecord[]
  userRole: string
}

export function AttendanceMarking({ initialRecords, userRole }: AttendanceMarkingProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [exams, setExams] = useState<Exam[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedExamId, setSelectedExamId] = useState("")
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const [selectedRoomId, setSelectedRoomId] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(initialRecords)
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>(initialRecords)
  const [seatingArrangements, setSeatingArrangements] = useState<any[]>([])
  const [markingMode, setMarkingMode] = useState<"individual" | "bulk">("individual")
  const [newAttendance, setNewAttendance] = useState({
    examId: "",
    subjectId: "",
    studentId: "",
    roomId: "",
    status: "PRESENT" as "PRESENT" | "ABSENT" | "LATE",
  })
  const [bulkAttendance, setBulkAttendance] = useState<
    {
      studentId: string
      studentName: string
      status: "PRESENT" | "ABSENT" | "LATE"
    }[]
  >([])

  // Fetch exams, students, and rooms for attendance marking
  useEffect(() => {
    if (open) {
      const fetchData = async () => {
        try {
          // Fetch exams
          const examsResponse = await fetch("/api/exams")
          if (!examsResponse.ok) {
            throw new Error("Failed to fetch exams")
          }
          const examsData = await examsResponse.json()
          setExams(examsData)

          // Fetch rooms
          const roomsResponse = await fetch("/api/rooms")
          if (!roomsResponse.ok) {
            throw new Error("Failed to fetch rooms")
          }
          const roomsData = await roomsResponse.json()
          setRooms(roomsData)

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
            description: "Failed to load data for attendance marking",
          })
        }
      }

      fetchData()
    }
  }, [open, toast])

  // Filter attendance records based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredRecords(attendanceRecords)
    } else {
      const query = searchQuery.toLowerCase()
      setFilteredRecords(
        attendanceRecords.filter(
          (record) =>
            record.student.name.toLowerCase().includes(query) ||
            record.student.email.toLowerCase().includes(query) ||
            record.room.roomNumber.toLowerCase().includes(query) ||
            record.room.building.name.toLowerCase().includes(query),
        ),
      )
    }
  }, [searchQuery, attendanceRecords])

  // Fetch seating arrangements when exam and subject are selected
  useEffect(() => {
    if (markingMode === "bulk" && selectedExamId && selectedSubjectId && selectedRoomId) {
      const fetchSeatingArrangements = async () => {
        try {
          const response = await fetch(
            `/api/seating/by-room?examId=${selectedExamId}&subjectId=${selectedSubjectId}&roomId=${selectedRoomId}`,
          )
          if (!response.ok) {
            throw new Error("Failed to fetch seating arrangements")
          }
          const data = await response.json()
          setSeatingArrangements(data)

          // Initialize bulk attendance with all students set to PRESENT
          setBulkAttendance(
            data.map((arrangement: any) => ({
              studentId: arrangement.studentId,
              studentName: arrangement.student.name,
              status: "PRESENT" as "PRESENT" | "ABSENT" | "LATE",
            })),
          )
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load seating arrangements",
          })
        }
      }

      fetchSeatingArrangements()
    }
  }, [markingMode, selectedExamId, selectedSubjectId, selectedRoomId, toast])

  const handleInputChange = (name: string, value: string) => {
    setNewAttendance((prev) => ({ ...prev, [name]: value }))
  }

  const handleBulkStatusChange = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE") => {
    setBulkAttendance((prev) => prev.map((item) => (item.studentId === studentId ? { ...item, status } : item)))
  }

  const handleMarkAttendance = async () => {
    if (markingMode === "individual") {
      if (!newAttendance.examId || !newAttendance.subjectId || !newAttendance.studentId || !newAttendance.roomId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please fill in all fields",
        })
        return
      }
    } else {
      if (!selectedExamId || !selectedSubjectId || !selectedRoomId || bulkAttendance.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please select exam, subject, and room",
        })
        return
      }
    }

    setIsSubmitting(true)

    try {
      let response
      if (markingMode === "individual") {
        response = await fetch("/api/attendance", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newAttendance),
        })
      } else {
        response = await fetch("/api/attendance/bulk", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            examId: selectedExamId,
            subjectId: selectedSubjectId,
            roomId: selectedRoomId,
            attendanceData: bulkAttendance,
          }),
        })
      }

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to mark attendance")
      }

      const data = await response.json()

      toast({
        title: "Attendance marked",
        description:
          markingMode === "individual"
            ? "Attendance has been marked successfully"
            : `Marked attendance for ${data.count} students`,
      })

      setOpen(false)
      setNewAttendance({
        examId: "",
        subjectId: "",
        studentId: "",
        roomId: "",
        status: "PRESENT",
      })
      setBulkAttendance([])
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to mark attendance",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search attendance records..."
            className="pl-8 w-full sm:w-[300px]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {userRole !== "STUDENT" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Mark Attendance
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Mark Attendance</DialogTitle>
                <DialogDescription>Record student attendance for an exam</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <RadioGroup
                  className="flex items-center space-x-4"
                  value={markingMode}
                  onValueChange={(value) => setMarkingMode(value as "individual" | "bulk")}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="individual" id="individual" />
                    <Label htmlFor="individual">Individual Student</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="bulk" id="bulk" />
                    <Label htmlFor="bulk">Bulk (By Room)</Label>
                  </div>
                </RadioGroup>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="examId" className="text-right">
                    Exam
                  </Label>
                  <Select
                    onValueChange={(value) => {
                      if (markingMode === "individual") {
                        handleInputChange("examId", value)
                      }
                      setSelectedExamId(value)
                      setSelectedSubjectId("")
                    }}
                    value={markingMode === "individual" ? newAttendance.examId : selectedExamId}
                  >
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

                {(markingMode === "individual" ? newAttendance.examId : selectedExamId) && (
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="subjectId" className="text-right">
                      Subject
                    </Label>
                    <Select
                      onValueChange={(value) => {
                        if (markingMode === "individual") {
                          handleInputChange("subjectId", value)
                        }
                        setSelectedSubjectId(value)
                      }}
                      value={markingMode === "individual" ? newAttendance.subjectId : selectedSubjectId}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {exams
                          .find(
                            (exam) =>
                              exam.id === (markingMode === "individual" ? newAttendance.examId : selectedExamId),
                          )
                          ?.subjects?.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name} ({subject.code})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {markingMode === "individual" ? (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="studentId" className="text-right">
                        Student
                      </Label>
                      <Select onValueChange={(value) => handleInputChange("studentId", value)}>
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
                      <Label htmlFor="roomId" className="text-right">
                        Room
                      </Label>
                      <Select onValueChange={(value) => handleInputChange("roomId", value)}>
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.building?.name} - Room {room.roomNumber} (Floor {room.floor})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="status" className="text-right">
                        Status
                      </Label>
                      <Select
                        defaultValue="PRESENT"
                        onValueChange={(value) => handleInputChange("status", value as "PRESENT" | "ABSENT" | "LATE")}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="PRESENT">Present</SelectItem>
                          <SelectItem value="ABSENT">Absent</SelectItem>
                          <SelectItem value="LATE">Late</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="roomId" className="text-right">
                        Room
                      </Label>
                      <Select
                        onValueChange={(value) => {
                          setSelectedRoomId(value)
                        }}
                        value={selectedRoomId}
                      >
                        <SelectTrigger className="col-span-3">
                          <SelectValue placeholder="Select room" />
                        </SelectTrigger>
                        <SelectContent>
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              {room.building?.name} - Room {room.roomNumber} (Floor {room.floor})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {bulkAttendance.length > 0 && (
                      <div className="col-span-4 border rounded-md p-4 max-h-60 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bulkAttendance.map((item) => (
                              <TableRow key={item.studentId}>
                                <TableCell>{item.studentName}</TableCell>
                                <TableCell>
                                  <Select
                                    defaultValue="PRESENT"
                                    value={item.status}
                                    onValueChange={(value) =>
                                      handleBulkStatusChange(item.studentId, value as "PRESENT" | "ABSENT" | "LATE")
                                    }
                                  >
                                    <SelectTrigger className="w-[120px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="PRESENT">Present</SelectItem>
                                      <SelectItem value="ABSENT">Absent</SelectItem>
                                      <SelectItem value="LATE">Late</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleMarkAttendance} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Mark Attendance"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {filteredRecords.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No attendance records found</h3>
          <p className="text-sm text-muted-foreground">
            {userRole === "STUDENT"
              ? "No attendance records available for you."
              : "Start marking attendance by clicking the button above."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Marked At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRecords.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.student.name}</TableCell>
                <TableCell>{record.exam?.title || "Unknown Exam"}</TableCell>
                <TableCell>
                  {record.room.building.name} - Room {record.room.roomNumber}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {record.status === "PRESENT" ? (
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    ) : record.status === "ABSENT" ? (
                      <XCircle className="mr-2 h-4 w-4 text-red-500" />
                    ) : (
                      <div className="mr-2 h-4 w-4 rounded-full bg-yellow-500" />
                    )}
                    {record.status}
                  </div>
                </TableCell>
                <TableCell>{format(new Date(record.markedAt), "PPP p")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
