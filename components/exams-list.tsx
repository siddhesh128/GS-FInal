"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { BookOpen, ChevronDown, ChevronRight, PlusCircle } from "lucide-react"

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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

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

interface SubjectSchedule {
  subjectId: string
  date: string
  startTime: string
  endTime: string
}

interface Exam {
  id: string
  title: string
  courseCode?: string
  date: string
  startTime: string
  endTime: string
  location: string
  subjects?: Subject[]
  subjectSchedules?: SubjectSchedule[]
}

// Extended interface for the exam creation payload
interface ExamPayload {
  title: string
  courseCode: string
  date: string
  startTime: string
  endTime: string
  location: string
  subjectIds: string[]
  subjectSchedules?: SubjectSchedule[]
}

interface ExamsListProps {
  exams: Exam[]
  userRole: string
}

// Add step indicator type
type CreateExamStep = 'details' | 'subjects' | 'schedules';

export function ExamsList({ exams, userRole }: ExamsListProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [isEnrolling, setIsEnrolling] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [open, setOpen] = useState(false)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({})
  const [newExam, setNewExam] = useState({
    title: "",
    courseCode: "",
    date: "",
    startTime: "",
    endTime: "",
    location: "",
  })
  
  // New state for subject-specific schedules
  const [subjectSchedules, setSubjectSchedules] = useState<SubjectSchedule[]>([])
  
  // Track the current step in the creation process
  const [currentStep, setCurrentStep] = useState<CreateExamStep>('details')

  // Add new state for the subject modal
  const [viewingSubjects, setViewingSubjects] = useState<{
    isOpen: boolean;
    examId: string | null;
    examTitle: string;
    subjects: Subject[];
    subjectSchedules?: SubjectSchedule[];
  }>({
    isOpen: false,
    examId: null,
    examTitle: "",
    subjects: [],
    subjectSchedules: undefined,
  });

  // Function to open the subject details modal
  const openSubjectDetails = (exam: Exam) => {
    if (!exam.subjects) return;
    
    setViewingSubjects({
      isOpen: true,
      examId: exam.id,
      examTitle: exam.title,
      subjects: [...exam.subjects],
      subjectSchedules: exam.subjectSchedules,
    });
  }

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

  // Initialize subject schedules when subjects are selected
  useEffect(() => {
    if (selectedSubjects.length > 0) {
      const selectedSubjectsData = subjects.filter(subject => 
        selectedSubjects.includes(subject.id)
      )
      
      const initialSchedules: SubjectSchedule[] = selectedSubjectsData.map(subject => ({
        subjectId: subject.id,
        date: newExam.date,
        startTime: newExam.startTime,
        endTime: newExam.endTime,
      }))
      
      setSubjectSchedules(initialSchedules)
    } else {
      setSubjectSchedules([])
    }
  }, [selectedSubjects, subjects, newExam.date, newExam.startTime, newExam.endTime])

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
      // Prepare the payload
      const payload: ExamPayload = {
        ...newExam,
        subjectIds: selectedSubjects,
      }
      
      // Add subject schedules if enabled
      if (subjectSchedules.length > 0) {
        payload.subjectSchedules = subjectSchedules
      }
      
      const response = await fetch("/api/exams", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
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
      setSubjectSchedules([])
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNewExam((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId],
    )
  }
  
  const handleSubjectScheduleChange = (
    subjectId: string, 
    field: keyof Omit<SubjectSchedule, 'subjectId'>, 
    value: string
  ) => {
    setSubjectSchedules(prevSchedules => 
      prevSchedules.map(schedule => {
        if (schedule.subjectId === subjectId) {
          return {
            ...schedule,
            [field]: value,
          }
        }
        return schedule
      })
    )
  }
  
  const toggleSubjectExpand = (examId: string) => {
    setExpandedSubjects(prev => ({
      ...prev,
      [examId]: !prev[examId]
    }))
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
                <DialogDescription>
                  {currentStep === 'details' && "Step 1: Enter basic exam information"}
                  {currentStep === 'subjects' && "Step 2: Select subjects for this exam"}
                  {currentStep === 'schedules' && "Step 3: Set up schedule for each subject"}
                </DialogDescription>
              </DialogHeader>
              
              {/* Step indicator */}
              <div className="flex items-center justify-between text-sm mb-4">
                <div className={`flex items-center ${currentStep === 'details' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  <div className="rounded-full bg-primary text-primary-foreground w-6 h-6 inline-flex items-center justify-center mr-2">
                    1
                  </div>
                  <span>Details</span>
                </div>
                <div className="h-px bg-border flex-1 mx-2" />
                <div className={`flex items-center ${currentStep === 'subjects' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  <div className={`rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 ${currentStep === 'subjects' || currentStep === 'schedules' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    2
                  </div>
                  <span>Subjects</span>
                </div>
                <div className="h-px bg-border flex-1 mx-2" />
                <div className={`flex items-center ${currentStep === 'schedules' ? 'text-primary font-semibold' : 'text-muted-foreground'}`}>
                  <div className={`rounded-full w-6 h-6 inline-flex items-center justify-center mr-2 ${currentStep === 'schedules' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    3
                  </div>
                  <span>Schedules</span>
                </div>
              </div>

              {/* Step 1: Exam Details */}
              {currentStep === 'details' && (
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
                </div>
              )}
              
              {/* Step 2: Subject Selection */}
              {currentStep === 'subjects' && (
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Select Subjects</Label>
                    <div className="col-span-3 border rounded-md">
                      <ScrollArea className="h-72 w-full">
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
                  
                  {selectedSubjects.length === 0 && (
                    <p className="text-sm text-center text-amber-600">
                      Please select at least one subject to continue.
                    </p>
                  )}
                </div>
              )}
              
              {/* Step 3: Subject Schedules */}
              {currentStep === 'schedules' && (
                <div className="grid gap-4 py-4">
                  <p className="text-sm mb-2">
                    You can set specific schedule for each subject. Leave unchanged to use the main exam schedule.
                  </p>
                  
                  <ScrollArea className="h-72 w-full pr-2 border rounded-md">
                    <div className="p-4 space-y-4">
                      {subjectSchedules.map(schedule => {
                        const subject = subjects.find(s => s.id === schedule.subjectId)
                        if (!subject) return null
                        
                        return (
                          <div key={subject.id} className="border rounded-md p-3 mb-2">
                            <div className="font-medium mb-3 flex items-center">
                              <BookOpen className="h-4 w-4 mr-2" />
                              {subject.name} ({subject.code})
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                              <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor={`${subject.id}-date`} className="text-sm">
                                  Date
                                </Label>
                                <div className="col-span-2">
                                  <Input
                                    id={`${subject.id}-date`}
                                    type="date"
                                    value={schedule.date}
                                    onChange={(e) => handleSubjectScheduleChange(subject.id, 'date', e.target.value)}
                                    className="h-8 text-sm w-full"
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor={`${subject.id}-start`} className="text-sm">
                                  Start Time
                                </Label>
                                <div className="col-span-2">
                                  <Input
                                    id={`${subject.id}-start`}
                                    type="time"
                                    value={schedule.startTime}
                                    onChange={(e) => handleSubjectScheduleChange(subject.id, 'startTime', e.target.value)}
                                    className="h-8 text-sm w-full"
                                  />
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-3 items-center gap-2">
                                <Label htmlFor={`${subject.id}-end`} className="text-sm">
                                  End Time
                                </Label>
                                <div className="col-span-2">
                                  <Input
                                    id={`${subject.id}-end`}
                                    type="time"
                                    value={schedule.endTime}
                                    onChange={(e) => handleSubjectScheduleChange(subject.id, 'endTime', e.target.value)}
                                    className="h-8 text-sm w-full"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}
              
              <DialogFooter className="flex justify-between">
                {currentStep !== 'details' && (
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentStep(currentStep === 'schedules' ? 'subjects' : 'details')}
                  >
                    Back
                  </Button>
                )}
                
                <div>
                  {currentStep !== 'schedules' ? (
                    <Button 
                      onClick={() => {
                        if (currentStep === 'details') {
                          // Validate fields before proceeding
                          if (!newExam.title || !newExam.date || !newExam.startTime || !newExam.endTime) {
                            toast({
                              variant: "destructive",
                              title: "Missing information",
                              description: "Please fill in all required fields",
                            });
                            return;
                          }
                          setCurrentStep('subjects');
                        } else if (currentStep === 'subjects') {
                          // Validate subject selection before proceeding
                          if (selectedSubjects.length === 0) {
                            toast({
                              variant: "destructive", 
                              title: "No subjects selected",
                              description: "Please select at least one subject",
                            });
                            return;
                          }
                          
                          // Initialize subject schedules with main exam schedule
                          const schedules = selectedSubjects.map(subjectId => ({
                            subjectId,
                            date: newExam.date,
                            startTime: newExam.startTime,
                            endTime: newExam.endTime,
                          }));
                          setSubjectSchedules(schedules);
                          
                          setCurrentStep('schedules');
                        }
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      onClick={handleCreateExam} 
                      disabled={isCreating}
                    >
                      {isCreating ? "Creating..." : "Create Exam"}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

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
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {exams.map((exam) => (
              <React.Fragment key={exam.id}>
                <TableRow>
                  <TableCell className="font-medium">{exam.title}</TableCell>
                  <TableCell>{exam.courseCode}</TableCell>
                  <TableCell>{format(new Date(exam.date), "PPP")}</TableCell>
                  <TableCell>{`${exam.startTime} - ${exam.endTime}`}</TableCell>
                  <TableCell>{exam.location}</TableCell>
                  <TableCell>
                    {exam.subjects && exam.subjects.length > 0 ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => openSubjectDetails(exam)}
                        className="h-auto"
                      >
                        {exam.subjects.length} {exam.subjects.length === 1 ? 'subject' : 'subjects'}
                      </Button>
                    ) : (
                      "None"
                    )}
                  </TableCell>
                  <TableCell>
                    {userRole === "STUDENT" && (
                      <Button variant="outline" size="sm" onClick={() => handleEnroll(exam.id)} disabled={isEnrolling}>
                        {isEnrolling ? "Enrolling..." : "Enroll"}
                      </Button>
                    )}
                    {userRole === "ADMIN" && (
                      <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/exams/${exam.id}`)}>
                        View Details
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
                {exam.subjectSchedules && exam.subjectSchedules.length > 0 && expandedSubjects[exam.id] && (
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={7} className="p-0">
                      <div className="p-2">
                        <h4 className="text-sm font-semibold mb-2">Subject-specific Schedules</h4>
                        <div className="space-y-2">
                          {exam.subjectSchedules.map(schedule => {
                            const subject = exam.subjects?.find(s => s.id === schedule.subjectId)
                            if (!subject) return null
                            
                            return (
                              <div key={`${exam.id}-${subject.id}`} className="grid grid-cols-7 text-sm">
                                <div className="col-span-2 font-medium">{subject.name} ({subject.code})</div>
                                <div className="col-span-2">{format(new Date(schedule.date), "PPP")}</div>
                                <div className="col-span-3">{schedule.startTime} - {schedule.endTime}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Subject Details Modal */}
      <Dialog open={viewingSubjects.isOpen} onOpenChange={(open) => 
        setViewingSubjects(prev => ({ ...prev, isOpen: open }))
      }>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Subjects for {viewingSubjects.examTitle}</DialogTitle>
            <DialogDescription>
              {viewingSubjects.subjects.length} {viewingSubjects.subjects.length === 1 ? 'subject' : 'subjects'} in this exam
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ScrollArea className="h-[300px] w-full pr-4 rounded-md border">
              <div className="p-4 space-y-4">
                {viewingSubjects.subjects.map((subject) => {
                  // Find the schedule for this subject if available
                  const schedule = viewingSubjects.subjectSchedules?.find(
                    s => s.subjectId === subject.id
                  );
                  
                  return (
                    <div key={subject.id} className="p-3 rounded-md border">
                      <div className="font-medium flex items-center">
                        <BookOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span>{subject.name} ({subject.code})</span>
                      </div>
                      
                      {schedule && (
                        <div className="mt-2 pl-6 space-y-1 text-sm">
                          <div className="grid grid-cols-2">
                            <span className="text-muted-foreground">Date:</span>
                            <span>{format(new Date(schedule.date), "PPP")}</span>
                          </div>
                          <div className="grid grid-cols-2">
                            <span className="text-muted-foreground">Time:</span>
                            <span>{schedule.startTime} - {schedule.endTime}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            
            {viewingSubjects.subjectSchedules && viewingSubjects.subjectSchedules.length > 0 && (
              <div className="p-3 rounded-md border bg-muted/30">
                <p className="text-sm font-medium mb-1">Note:</p>
                <p className="text-xs text-muted-foreground">
                  This exam has subject-specific schedules. Each subject may have a different date or time.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline"
              onClick={() => setViewingSubjects(prev => ({ ...prev, isOpen: false }))}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
