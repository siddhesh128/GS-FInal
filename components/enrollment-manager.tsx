"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { PlusCircle, Trash2 } from "lucide-react"

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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

interface Student {
  id: string
  name: string
  email: string
}

interface Exam {
  id: string
  title: string
  courseCode: string
  date: string
}

interface Enrollment {
  id: string
  examId: string
  studentId: string
  exam: {
    title: string
    courseCode: string
    date: string
  }
  student: {
    name: string
    email: string
  }
}

interface EnrollmentManagerProps {
  enrollments: Enrollment[]
}

export function EnrollmentManager({ enrollments: initialEnrollments }: EnrollmentManagerProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>(initialEnrollments)
  const [exams, setExams] = useState<Exam[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [newEnrollment, setNewEnrollment] = useState({
    examId: "",
    studentId: "",
  })
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [bulkMode, setBulkMode] = useState(false)

  useEffect(() => {
    if (open) {
      const fetchExamsAndStudents = async () => {
        try {
          const examsResponse = await fetch("/api/exams")
          if (!examsResponse.ok) {
            throw new Error("Failed to fetch exams")
          }
          const examsData = await examsResponse.json()
          setExams(examsData)

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
            description: "Failed to load data for enrollment creation",
          })
        }
      }

      fetchExamsAndStudents()
    }
  }, [open, toast])

  const handleCreateEnrollment = async () => {
    if (!newEnrollment.examId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an exam",
      })
      return
    }

    if (bulkMode && selectedStudents.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one student",
      })
      return
    }

    if (!bulkMode && !newEnrollment.studentId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a student",
      })
      return
    }

    setIsCreating(true)

    try {
      if (bulkMode) {
        const results = await Promise.allSettled(
          selectedStudents.map((studentId) =>
            fetch("/api/enrollments", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ examId: newEnrollment.examId, studentId }),
            }).then((res) => res.json()),
          ),
        )

        const successful = results.filter((result) => result.status === "fulfilled").length
        const failed = results.length - successful

        toast({
          title: "Enrollments created",
          description: `Successfully enrolled ${successful} students${failed > 0 ? `, ${failed} failed` : ""}`,
        })

        const response = await fetch("/api/enrollments")
        if (response.ok) {
          const data = await response.json()
          setEnrollments(data)
        }
      } else {
        const response = await fetch("/api/enrollments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(newEnrollment),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.message || "Failed to create enrollment")
        }

        const data = await response.json()

        toast({
          title: "Enrollment created",
          description: "The enrollment has been created successfully",
        })

        const newEnrollmentData = {
          ...data,
          exam: exams.find((e) => e.id === data.examId) || {
            title: "Unknown",
            courseCode: "Unknown",
            date: new Date().toISOString(),
          },
          student: students.find((s) => s.id === data.studentId) || { name: "Unknown", email: "Unknown" },
        }

        setEnrollments([...enrollments, newEnrollmentData])
      }

      setOpen(false)
      setNewEnrollment({
        examId: "",
        studentId: "",
      })
      setSelectedStudents([])
      setBulkMode(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create enrollment",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteEnrollment = async (id: string) => {
    setIsDeleting(id)

    try {
      const response = await fetch(`/api/enrollments/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to delete enrollment")
      }

      toast({
        title: "Enrollment deleted",
        description: "The enrollment has been deleted successfully",
      })

      setEnrollments(enrollments.filter((e) => e.id !== id))
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete enrollment",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsDeleting(null)
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setNewEnrollment((prev) => ({ ...prev, [name]: value }))
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Enrollment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Enrollment</DialogTitle>
              <DialogDescription>Enroll student(s) in an exam</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="bulkMode"
                  checked={bulkMode}
                  onCheckedChange={(checked) => setBulkMode(checked as boolean)}
                />
                <Label htmlFor="bulkMode">Enroll multiple students</Label>
              </div>

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
                        {exam.title} - {exam.courseCode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {bulkMode ? (
                <div className="grid gap-2">
                  <Label className="mb-2">Select Students</Label>
                  <div className="border rounded-md h-60 overflow-y-auto p-2">
                    {students.map((student) => (
                      <div key={student.id} className="flex items-center space-x-2 py-2">
                        <Checkbox
                          id={`student-${student.id}`}
                          checked={selectedStudents.includes(student.id)}
                          onCheckedChange={() => toggleStudentSelection(student.id)}
                        />
                        <Label htmlFor={`student-${student.id}`}>
                          {student.name} - {student.email}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
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
              )}
            </div>
            <DialogFooter>
              <Button type="submit" onClick={handleCreateEnrollment} disabled={isCreating}>
                {isCreating ? "Creating..." : "Create Enrollment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {enrollments.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No enrollments found</h3>
          <p className="text-sm text-muted-foreground">Create your first enrollment by clicking the button above.</p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Course Code</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell className="font-medium">{enrollment.student.name}</TableCell>
                <TableCell>{enrollment.student.email}</TableCell>
                <TableCell>{enrollment.exam.title}</TableCell>
                <TableCell>{enrollment.exam.courseCode}</TableCell>
                <TableCell>{format(new Date(enrollment.exam.date), "PPP")}</TableCell>
                <TableCell>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteEnrollment(enrollment.id)}
                    disabled={isDeleting === enrollment.id}
                  >
                    {isDeleting === enrollment.id ? (
                      "Deleting..."
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </>
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
