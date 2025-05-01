"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { BookOpen, Calendar, Clock, PlusCircle, Trash2, UserPlus, UsersRound } from "lucide-react"

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
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface Subject {
  id: string
  name: string
  code: string
}

interface Student {
  id: string
  name: string
  email: string
  department?: string
  year?: string
}

interface Exam {
  id: string
  title: string
  courseCode: string
  date: string
  subjects?: Subject[]
  startTime?: string
  endTime?: string
}

interface SubjectSchedule {
  subjectId: string
  date: string
  startTime: string
  endTime: string
  isDefaultSchedule: boolean
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
  subject?: {
    name: string
    code: string
  }
  subjectSchedule?: {
    date: string
    startTime: string
    endTime: string
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
    subjectId: "",
  })
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [bulkMode, setBulkMode] = useState(false)
  const [batchEnrollment, setBatchEnrollment] = useState({
    examId: "",
    department: "",
    year: ""
  })
  const [isBatchEnrolling, setIsBatchEnrolling] = useState(false)
  const [selectedExamSubjects, setSelectedExamSubjects] = useState<Subject[]>([])
  const [subjectSchedules, setSubjectSchedules] = useState<SubjectSchedule[]>([])
  const [showSubjectScheduling, setShowSubjectScheduling] = useState(false)

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

  useEffect(() => {
    if (newEnrollment.examId) {
      const selectedExam = exams.find(exam => exam.id === newEnrollment.examId)
      if (selectedExam && selectedExam.subjects) {
        setSelectedExamSubjects(selectedExam.subjects)
        
        // Initialize default schedules for all subjects
        const initialSchedules: SubjectSchedule[] = selectedExam.subjects.map(subject => ({
          subjectId: subject.id,
          date: selectedExam.date,
          startTime: selectedExam.startTime || "09:00",
          endTime: selectedExam.endTime || "11:00",
          isDefaultSchedule: true
        }))
        
        setSubjectSchedules(initialSchedules)
      } else {
        setSelectedExamSubjects([])
        setSubjectSchedules([])
      }
    } else {
      setSelectedExamSubjects([])
      setSubjectSchedules([])
    }
  }, [newEnrollment.examId, exams])

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
        // Handle bulk enrollment with subject schedules if applicable
        const results = await Promise.allSettled(
          selectedStudents.map((studentId) => {
            const payload = {
              examId: newEnrollment.examId,
              studentId,
              subjectSchedules: showSubjectScheduling ? subjectSchedules : undefined
            }
            
            return fetch("/api/enrollments", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            }).then((res) => res.json())
          }),
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
        // Handle single student enrollment with subject schedule if applicable
        const payload = {
          examId: newEnrollment.examId,
          studentId: newEnrollment.studentId,
          subjectSchedules: showSubjectScheduling ? subjectSchedules : undefined
        }
        
        const response = await fetch("/api/enrollments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
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

        // Get the selected exam details
        const selectedExam = exams.find((e) => e.id === data.examId) || {
          title: "Unknown",
          courseCode: "Unknown",
          date: new Date().toISOString(),
        }
        
        // Get the selected student details
        const selectedStudent = students.find((s) => s.id === data.studentId) || { name: "Unknown", email: "Unknown" }
        
        const newEnrollmentData = {
          ...data,
          exam: selectedExam,
          student: selectedStudent,
        }

        setEnrollments([...enrollments, newEnrollmentData])
      }

      setOpen(false)
      setNewEnrollment({
        examId: "",
        studentId: "",
        subjectId: "",
      })
      setSelectedStudents([])
      setBulkMode(false)
      setSubjectSchedules([])
      setShowSubjectScheduling(false)
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

  const handleBatchEnrollment = async () => {
    if (!batchEnrollment.examId || !batchEnrollment.department || !batchEnrollment.year) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields",
      })
      return
    }

    setIsBatchEnrolling(true)

    try {
      const payload = {
        ...batchEnrollment,
        subjectSchedules: showSubjectScheduling ? subjectSchedules : undefined
      }
      
      const response = await fetch("/api/enrollments/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to create batch enrollment")
      }

      const data = await response.json()

      toast({
        title: "Batch Enrollment Successful",
        description: data.message,
      })

      // Refresh enrollments
      const updatedResponse = await fetch("/api/enrollments")
      if (updatedResponse.ok) {
        const updatedData = await updatedResponse.json()
        setEnrollments(updatedData)
      }

      setOpen(false)
      setBatchEnrollment({
        examId: "",
        department: "",
        year: "",
      })
      setSubjectSchedules([])
      setShowSubjectScheduling(false)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to create batch enrollment",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsBatchEnrolling(false)
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

  const handleBatchSelectChange = (name: string, value: string) => {
    setBatchEnrollment((prev) => ({ ...prev, [name]: value }))
  }

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId],
    )
  }

  const handleSubjectScheduleChange = (subjectId: string, field: keyof Omit<SubjectSchedule, 'subjectId' | 'isDefaultSchedule'>, value: string) => {
    setSubjectSchedules(prevSchedules => 
      prevSchedules.map(schedule => {
        if (schedule.subjectId === subjectId) {
          return {
            ...schedule,
            [field]: value,
            isDefaultSchedule: false,
          }
        }
        return schedule
      })
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end space-x-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Enrollment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Enrollment</DialogTitle>
              <DialogDescription>Enroll students in an exam</DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="individual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="individual">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Individual
                </TabsTrigger>
                <TabsTrigger value="batch">
                  <UsersRound className="mr-2 h-4 w-4" />
                  Batch
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="individual" className="space-y-4">
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

                {selectedExamSubjects.length > 0 && (
                  <div className="flex items-center space-x-2 my-2">
                    <Checkbox
                      id="showSubjectScheduling"
                      checked={showSubjectScheduling}
                      onCheckedChange={(checked) => setShowSubjectScheduling(checked as boolean)}
                    />
                    <Label htmlFor="showSubjectScheduling">Configure subject-specific schedules</Label>
                  </div>
                )}

                {showSubjectScheduling && selectedExamSubjects.length > 0 && (
                  <div className="border rounded-md p-2">
                    <Accordion type="multiple" className="w-full">
                      {selectedExamSubjects.map((subject) => {
                        const schedule = subjectSchedules.find(s => s.subjectId === subject.id);
                        if (!schedule) return null;
                        
                        return (
                          <AccordionItem value={subject.id} key={subject.id}>
                            <AccordionTrigger className="text-sm">
                              <div className="flex items-center">
                                <BookOpen className="h-4 w-4 mr-2" />
                                {subject.name} ({subject.code})
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3">
                              <div className="grid grid-cols-4 items-center gap-2">
                                <Label htmlFor={`${subject.id}-date`} className="text-right text-xs">
                                  Date
                                </Label>
                                <div className="col-span-3 flex items-center">
                                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <Input
                                    id={`${subject.id}-date`}
                                    type="date"
                                    value={schedule.date}
                                    onChange={(e) => handleSubjectScheduleChange(subject.id, 'date', e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-4 items-center gap-2">
                                <Label htmlFor={`${subject.id}-start`} className="text-right text-xs">
                                  Start
                                </Label>
                                <div className="col-span-3 flex items-center">
                                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <Input
                                    id={`${subject.id}-start`}
                                    type="time"
                                    value={schedule.startTime}
                                    onChange={(e) => handleSubjectScheduleChange(subject.id, 'startTime', e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-4 items-center gap-2">
                                <Label htmlFor={`${subject.id}-end`} className="text-right text-xs">
                                  End
                                </Label>
                                <div className="col-span-3 flex items-center">
                                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                  <Input
                                    id={`${subject.id}-end`}
                                    type="time"
                                    value={schedule.endTime}
                                    onChange={(e) => handleSubjectScheduleChange(subject.id, 'endTime', e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  </div>
                )}

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
                            {student.name} - {student.department ? `${student.department}` : ""} {student.year ? `(${student.year})` : ""} - {student.email}
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
                            {student.name} - {student.department ? `${student.department}` : ""} {student.year ? `(${student.year})` : ""} - {student.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                
                <DialogFooter>
                  <Button type="submit" onClick={handleCreateEnrollment} disabled={isCreating}>
                    {isCreating ? "Creating..." : "Create Enrollment"}
                  </Button>
                </DialogFooter>
              </TabsContent>
              
              <TabsContent value="batch" className="space-y-4">
                <div className="grid gap-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="batchExamId" className="text-right">
                      Exam
                    </Label>
                    <Select onValueChange={(value) => handleBatchSelectChange("examId", value)}>
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
                  
                  {selectedExamSubjects.length > 0 && batchEnrollment.examId && (
                    <div className="flex items-center space-x-2 my-2">
                      <Checkbox
                        id="batchShowSubjectScheduling"
                        checked={showSubjectScheduling}
                        onCheckedChange={(checked) => setShowSubjectScheduling(checked as boolean)}
                      />
                      <Label htmlFor="batchShowSubjectScheduling">Configure subject-specific schedules</Label>
                    </div>
                  )}

                  {showSubjectScheduling && selectedExamSubjects.length > 0 && batchEnrollment.examId && (
                    <div className="border rounded-md p-2">
                      <Accordion type="multiple" className="w-full">
                        {selectedExamSubjects.map((subject) => {
                          const schedule = subjectSchedules.find(s => s.subjectId === subject.id);
                          if (!schedule) return null;
                          
                          return (
                            <AccordionItem value={subject.id} key={subject.id}>
                              <AccordionTrigger className="text-sm">
                                <div className="flex items-center">
                                  <BookOpen className="h-4 w-4 mr-2" />
                                  {subject.name} ({subject.code})
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="space-y-3">
                                <div className="grid grid-cols-4 items-center gap-2">
                                  <Label htmlFor={`batch-${subject.id}-date`} className="text-right text-xs">
                                    Date
                                  </Label>
                                  <div className="col-span-3 flex items-center">
                                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <Input
                                      id={`batch-${subject.id}-date`}
                                      type="date"
                                      value={schedule.date}
                                      onChange={(e) => handleSubjectScheduleChange(subject.id, 'date', e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-4 items-center gap-2">
                                  <Label htmlFor={`batch-${subject.id}-start`} className="text-right text-xs">
                                    Start
                                  </Label>
                                  <div className="col-span-3 flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <Input
                                      id={`batch-${subject.id}-start`}
                                      type="time"
                                      value={schedule.startTime}
                                      onChange={(e) => handleSubjectScheduleChange(subject.id, 'startTime', e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-4 items-center gap-2">
                                  <Label htmlFor={`batch-${subject.id}-end`} className="text-right text-xs">
                                    End
                                  </Label>
                                  <div className="col-span-3 flex items-center">
                                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <Input
                                      id={`batch-${subject.id}-end`}
                                      type="time"
                                      value={schedule.endTime}
                                      onChange={(e) => handleSubjectScheduleChange(subject.id, 'endTime', e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          );
                        })}
                      </Accordion>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="department" className="text-right">
                      Department
                    </Label>
                    <Select onValueChange={(value) => handleBatchSelectChange("department", value)}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Computer Science">Computer Science</SelectItem>
                        <SelectItem value="E&TC">E&TC</SelectItem>
                        <SelectItem value="Mechanical">Mechanical</SelectItem>
                        <SelectItem value="AI&DS">AI&DS</SelectItem>
                        <SelectItem value="Civil">Civil</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="year" className="text-right">
                      Year
                    </Label>
                    <Select onValueChange={(value) => handleBatchSelectChange("year", value)}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FE">First Year (FE)</SelectItem>
                        <SelectItem value="SE">Second Year (SE)</SelectItem>
                        <SelectItem value="TE">Third Year (TE)</SelectItem>
                        <SelectItem value="BE">Fourth Year (BE)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button type="submit" onClick={handleBatchEnrollment} disabled={isBatchEnrolling}>
                    {isBatchEnrolling ? "Enrolling..." : "Enroll Department Year"}
                  </Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
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
              <TableHead>Subject</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
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
                <TableCell>
                  {enrollment.subject ? enrollment.subject.name : "All subjects"}
                </TableCell>
                <TableCell>
                  {enrollment.subjectSchedule 
                    ? format(new Date(enrollment.subjectSchedule.date), "PPP") 
                    : format(new Date(enrollment.exam.date), "PPP")}
                </TableCell>
                <TableCell>
                  {enrollment.subjectSchedule 
                    ? `${enrollment.subjectSchedule.startTime} - ${enrollment.subjectSchedule.endTime}`
                    : "Main exam schedule"}
                </TableCell>
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
