"use client"

import type React from "react"

import { useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

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

interface ExamResult {
  id: string
  examId: string
  studentId: string
  score: string
  grade: string
  feedback?: string
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

interface ExamResultsProps {
  results: ExamResult[]
  userRole: string
}

export function ExamResults({ results: initialResults, userRole }: ExamResultsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [results, setResults] = useState<ExamResult[]>(initialResults)
  const [exams, setExams] = useState<Exam[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [newResult, setNewResult] = useState({
    examId: "",
    studentId: "",
    score: "",
    grade: "",
    feedback: "",
  })

  // Fetch exams and students for result creation
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
        description: "Failed to load data for result creation",
      })
    }
  }

  const handleCreateResult = async () => {
    if (!newResult.examId || !newResult.studentId || !newResult.score || !newResult.grade) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newResult),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to create result")
      }

      const data = await response.json()

      toast({
        title: "Result created",
        description: "The exam result has been created successfully",
      })

      setOpen(false)
      setNewResult({
        examId: "",
        studentId: "",
        score: "",
        grade: "",
        feedback: "",
      })

      // Add the new result to the list
      const newResultData = {
        ...data,
        exam: exams.find((e) => e.id === data.examId) || {
          title: "Unknown",
          courseCode: "Unknown",
          date: new Date().toISOString(),
        },
        student: students.find((s) => s.id === data.studentId) || { name: "Unknown", email: "Unknown" },
      }

      setResults([...results, newResultData])
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create result",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNewResult((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setNewResult((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-4">
      {userRole === "ADMIN" && (
        <div className="flex justify-end">
          <Dialog
            open={open}
            onOpenChange={(isOpen) => {
              setOpen(isOpen)
              if (isOpen) {
                fetchExamsAndStudents()
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Result
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Exam Result</DialogTitle>
                <DialogDescription>Add a new exam result for a student</DialogDescription>
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
                          {exam.title} - {exam.courseCode}
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
                  <Label htmlFor="score" className="text-right">
                    Score
                  </Label>
                  <Input
                    id="score"
                    name="score"
                    value={newResult.score}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="grade" className="text-right">
                    Grade
                  </Label>
                  <Select onValueChange={(value) => handleSelectChange("grade", value)}>
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="F">F</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="feedback" className="text-right">
                    Feedback
                  </Label>
                  <Textarea
                    id="feedback"
                    name="feedback"
                    value={newResult.feedback}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateResult} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Result"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {results.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No results found</h3>
          <p className="text-sm text-muted-foreground">
            {userRole === "ADMIN"
              ? "Create your first result by clicking the button above."
              : "You don't have any exam results yet."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Exam</TableHead>
              {userRole === "ADMIN" && <TableHead>Student</TableHead>}
              <TableHead>Course Code</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Feedback</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.map((result) => (
              <TableRow key={result.id}>
                <TableCell className="font-medium">{result.exam.title}</TableCell>
                {userRole === "ADMIN" && <TableCell>{result.student.name}</TableCell>}
                <TableCell>{result.exam.courseCode}</TableCell>
                <TableCell>{format(new Date(result.exam.date), "PPP")}</TableCell>
                <TableCell>{result.score}</TableCell>
                <TableCell>{result.grade}</TableCell>
                <TableCell>{result.feedback || "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
