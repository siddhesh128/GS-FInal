"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { PlusCircle, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

interface User {
  id: string
  name: string
  email: string
}

interface Subject {
  id: string
  name: string
  code: string
}

interface Exam {
  id: string
  title: string
  courseCode?: string
  date: string
  startTime: string
  endTime: string
  location: string
  invigilatorId?: string
  invigilator?: {
    id: string
    name: string
    email: string
  }
  subjects?: Subject[]
}

interface ExamsListProps {
  exams: Exam[]
  userRole: string
}

export function ExamsList({ exams, userRole }: ExamsListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isAssigningInvigilator, setIsAssigningInvigilator] = useState(false)
  const [open, setOpen] = useState(false)
  const [invigilatorDialogOpen, setInvigilatorDialogOpen] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [facultyUsers, setFacultyUsers] = useState<User[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedInvigilatorId, setSelectedInvigilatorId] = useState<string>("")
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [newExam, setNewExam] = useState({
    title: "",
    courseCode: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
  })

  // Fetch faculty users for invigilator assignment
  useEffect(() => {
    if (userRole === "ADMIN" && invigilatorDialogOpen) {
      const fetchFacultyUsers = async () => {
        try {
          const response = await fetch("/api/users?role=FACULTY")
          if (!response.ok) {
            throw new Error("Failed to fetch faculty users")
          }
          const data = await response.json()
          setFacultyUsers(data)
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load faculty users",
          })
        }
      }

      fetchFacultyUsers()
    }
  }, [invigilatorDialogOpen, userRole, toast])

  // Fetch subjects when creating a new exam
  useEffect(() => {
    if (userRole === "ADMIN" && open) {
      const fetchSubjects = async () => {
        try {
          const response = await fetch("/api/subjects")
          if (!response.ok) {
            throw new Error("Failed to fetch subjects")
          }
          const data = await response.json()
          setSubjects(data)
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load subjects",
          })
        }
      }

      fetchSubjects()
    }
  }, [open, userRole, toast])

  const handleEnroll = async (examId: string) => {
    setIsEnrolling(true)

    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId,
          studentId: "current", // The API will use the current user's ID
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to enroll in exam")
      }

      toast({
        title: "Enrolled successfully",
        description: "You have been enrolled in the exam",
      })

      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Enrollment failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsEnrolling(false)
    }
  }

  const handleCreateExam = async () => {
    if (selectedSubjects.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one subject for the exam",
      })
      return
    }

    setIsCreating(true)

    try {
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newExam,
          subjectIds: selectedSubjects,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || "Failed to create exam")
      }

      toast({
        title: "Exam created",
        description: "The exam has been created successfully",
      })

      setOpen(false)
      setNewExam({
        title: "",
        courseCode: "",
        date: "",
        startTime: "",
        endTime: "",
        location: "",
      })
      setSelectedSubjects([])
      router.refresh()
    } catch (error) {
      console.error("Error creating exam:", error)
      toast({
        variant: "destructive",
        title: "Failed to create exam",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleAssignInvigilator = async () => {
    if (!selectedExamId || !selectedInvigilatorId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an invigilator",
      })
      return
    }

    setIsAssigningInvigilator(true)

    try {
      const response = await fetch(`/api/exams/${selectedExamId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invigilatorId: selectedInvigilatorId,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to assign invigilator")
      }

      toast({
        title: "Invigilator assigned",
        description: "The invigilator has been assigned successfully",
      })

      setInvigilatorDialogOpen(false)
      setSelectedExamId(null)
      setSelectedInvigilatorId("")
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to assign invigilator",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsAssigningInvigilator(false)
    }
  }

  const openInvigilatorDialog = (examId: string) => {
    setSelectedExamId(examId)
    setInvigilatorDialogOpen(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewExam((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId],
    )
  }

  return (
    <div className="space-y-4">
      {userRole === "ADMIN" && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Exam
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Exam</DialogTitle>
                <DialogDescription>Add a new examination to the system</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">
                    Title
                  </Label>
                  <Input
                    id="title"
                    name="title"
                    value={newExam.title}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="courseCode" className="text-right">
                    Course Code
                  </Label>
                  <Input
                    id="courseCode"
                    name="courseCode"
                    value={newExam.courseCode}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">
                    Date
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={newExam.date}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="startTime" className="text-right">
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="time"
                    value={newExam.startTime}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="endTime" className="text-right">
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    name="endTime"
                    type="time"
                    value={newExam.endTime}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="location" className="text-right">
                    Location
                  </Label>
                  <Input
                    id="location"
                    name="location"
                    value={newExam.location}
                    onChange={handleInputChange}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Subjects</Label>
                  <div className="col-span-3 border rounded-md">
                    <ScrollArea className="h-60 w-full">
                      <div className="p-4 space-y-2">
                        {subjects.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No subjects found. Please create subjects first.
                          </p>
                        ) : (
                          subjects.map((subject) => (
                            <div key={subject.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`subject-${subject.id}`}
                                checked={selectedSubjects.includes(subject.id)}
                                onCheckedChange={() => handleSubjectToggle(subject.id)}
                              />
                              <Label htmlFor={`subject-${subject.id}`} className="flex-1">
                                {subject.name} ({subject.code})
                              </Label>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateExam} disabled={isCreating}>
                  {isCreating ? "Creating..." : "Create Exam"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Invigilator Assignment Dialog */}
      <Dialog open={invigilatorDialogOpen} onOpenChange={setInvigilatorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Invigilator</DialogTitle>
            <DialogDescription>Select a faculty member to invigilate this exam</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="invigilator" className="text-right">
                Invigilator
              </Label>
              <Select onValueChange={setSelectedInvigilatorId}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select faculty member" />
                </SelectTrigger>
                <SelectContent>
                  {facultyUsers.map((faculty) => (
                    <SelectItem key={faculty.id} value={faculty.id}>
                      {faculty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" onClick={handleAssignInvigilator} disabled={isAssigningInvigilator}>
              {isAssigningInvigilator ? "Assigning..." : "Assign Invigilator"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {exams.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No exams found</h3>
          <p className="text-sm text-muted-foreground">
            {userRole === "ADMIN"
              ? "Create your first exam by clicking the 'Add Exam' button above."
              : userRole === "FACULTY"
                ? "You don't have any invigilation duties assigned yet."
                : "You are not enrolled in any exams yet."}
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Course Code</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Subjects</TableHead>
              {userRole === "ADMIN" && <TableHead>Invigilator</TableHead>}
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => (
              <TableRow key={exam.id}>
                <TableCell className="font-medium">{exam.title}</TableCell>
                <TableCell>{exam.courseCode}</TableCell>
                <TableCell>{format(new Date(exam.date), "PPP")}</TableCell>
                <TableCell>{`${exam.startTime} - ${exam.endTime}`}</TableCell>
                <TableCell>{exam.location}</TableCell>
                <TableCell>
                  {exam.subjects && exam.subjects.length > 0
                    ? exam.subjects.map((subject) => subject.name).join(", ")
                    : "None"}
                </TableCell>
                {userRole === "ADMIN" && <TableCell>{exam.invigilator?.name || "Not assigned"}</TableCell>}
                <TableCell>
                  {userRole === "STUDENT" ? (
                    <Button variant="outline" size="sm" onClick={() => handleEnroll(exam.id)} disabled={isEnrolling}>
                      {isEnrolling ? "Enrolling..." : "Enroll"}
                    </Button>
                  ) : (
                    userRole === "ADMIN" && (
                      <Button variant="outline" size="sm" onClick={() => openInvigilatorDialog(exam.id)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Assign Invigilator
                      </Button>
                    )
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
