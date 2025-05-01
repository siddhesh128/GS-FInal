"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Grid, Loader2 } from "lucide-react"
import { format } from "date-fns"

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
import { useToast } from "@/components/ui/use-toast"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

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

interface Building {
  id: string
  name: string
  number: string
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

interface Faculty {
  id: string
  name: string
  email: string
}

interface RoomInvigilator {
  roomId: string
  invigilatorId: string
}

export function BulkSeatingGenerator() {
  const router = useRouter()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [exams, setExams] = useState<Exam[]>([])
  const [buildings, setBuildings] = useState<Building[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [facultyUsers, setFacultyUsers] = useState<Faculty[]>([])
  const [selectedExamId, setSelectedExamId] = useState("")
  const [selectedSubjectId, setSelectedSubjectId] = useState("")
  const [selectedBuildingId, setSelectedBuildingId] = useState("")
  const [roomPrefix, setRoomPrefix] = useState("R")
  const [seatPrefix, setSeatPrefix] = useState("S")
  const [studentsPerRoom, setStudentsPerRoom] = useState("20")
  const [generationMode, setGenerationMode] = useState("auto")
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([])
  const [roomInvigilators, setRoomInvigilators] = useState<RoomInvigilator[]>([])
  const [generateForAllSubjects, setGenerateForAllSubjects] = useState(false)

  // Fetch exams for bulk seating generation
  useEffect(() => {
    if (open) {
      const fetchExams = async () => {
        try {
          const response = await fetch("/api/exams")
          if (!response.ok) {
            throw new Error("Failed to fetch exams")
          }
          const data = await response.json()
          setExams(data)
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load exams",
          })
        }
      }

      const fetchBuildings = async () => {
        try {
          const response = await fetch("/api/buildings")
          if (!response.ok) {
            throw new Error("Failed to fetch buildings")
          }
          const data = await response.json()
          setBuildings(data)
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load buildings",
          })
        }
      }

      const fetchRooms = async () => {
        try {
          const response = await fetch("/api/rooms")
          if (!response.ok) {
            throw new Error("Failed to fetch rooms")
          }
          const data = await response.json()
          setRooms(data)
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load rooms",
          })
        }
      }

      const fetchFaculty = async () => {
        try {
          const response = await fetch("/api/users?role=FACULTY")
          if (!response.ok) {
            throw new Error("Failed to fetch faculty")
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

      fetchExams()
      fetchBuildings()
      fetchRooms()
      fetchFaculty()
    }
  }, [open, toast])

  // Filter rooms when building is selected
  useEffect(() => {
    if (selectedBuildingId) {
      setFilteredRooms(rooms.filter((room) => room.buildingId === selectedBuildingId))
    } else {
      setFilteredRooms(rooms)
    }
  }, [selectedBuildingId, rooms])

  // Reset room invigilators when selected rooms change
  useEffect(() => {
    if (generationMode === "manual") {
      setRoomInvigilators(
        selectedRoomIds.map(roomId => {
          // Keep existing invigilator if room was already selected
          const existingAssignment = roomInvigilators.find(ri => ri.roomId === roomId)
          return {
            roomId,
            invigilatorId: existingAssignment?.invigilatorId || ""
          }
        })
      )
    }
  }, [selectedRoomIds, generationMode])

  const handleUpdateRoomInvigilator = (roomId: string, invigilatorId: string) => {
    setRoomInvigilators(prev => 
      prev.map(item => item.roomId === roomId ? { ...item, invigilatorId } : item)
    )
  }

  const handleGenerateSeating = async () => {
    if (!selectedExamId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select an exam",
      })
      return
    }

    // Only require subject selection if not generating for all subjects
    if (!generateForAllSubjects && !selectedSubjectId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a subject",
      })
      return
    }

    if (generationMode === "manual" && selectedRoomIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select at least one room",
      })
      return
    }

    setIsGenerating(true)

    try {
      const response = await fetch("/api/seating/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId: selectedExamId,
          subjectId: generateForAllSubjects ? null : selectedSubjectId,
          generateForAllSubjects: generateForAllSubjects,
          roomPrefix,
          seatPrefix,
          studentsPerRoom: Number.parseInt(studentsPerRoom, 10),
          generationMode,
          roomIds: generationMode === "manual" ? selectedRoomIds : undefined,
          buildingId: selectedBuildingId || undefined,
          roomInvigilators: roomInvigilators.filter(ri => ri.invigilatorId),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to generate seating arrangements")
      }

      const data = await response.json()

      toast({
        title: "Seating arrangements generated",
        description: `Successfully created ${data.count} seating arrangements`,
      })

      setOpen(false)
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to generate seating arrangements",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleRoomToggle = (roomId: string) => {
    setSelectedRoomIds((prev) => (prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId]))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Grid className="mr-2 h-4 w-4" />
          Generate Seating
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Generate Seating Arrangements</DialogTitle>
          <DialogDescription>Automatically generate seating arrangements for all enrolled students</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="examId" className="text-right">
              Exam
            </Label>
            <Select
              onValueChange={(value) => {
                setSelectedExamId(value)
                setSelectedSubjectId("")
              }}
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

          {selectedExamId && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subjectId" className="text-right">
                Subject
              </Label>
              <div className="col-span-3">
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="checkbox"
                    id="allSubjects"
                    checked={generateForAllSubjects}
                    onChange={(e) => setGenerateForAllSubjects(e.target.checked)}
                  />
                  <Label htmlFor="allSubjects">Generate for all subjects in this exam</Label>
                </div>
                
                {!generateForAllSubjects && (
                  <Select onValueChange={setSelectedSubjectId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams
                        .find((exam) => exam.id === selectedExamId)
                        ?.subjects?.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} ({subject.code})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Generation Mode</Label>
            <RadioGroup className="col-span-3" value={generationMode} onValueChange={setGenerationMode}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto" id="auto" />
                <Label htmlFor="auto">Automatic (System assigns rooms)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual">Manual (Select specific rooms)</Label>
              </div>
            </RadioGroup>
          </div>

          {generationMode === "auto" ? (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="buildingId" className="text-right">
                  Building (Optional)
                </Label>
                <Select onValueChange={setSelectedBuildingId}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="All buildings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All buildings</SelectItem>
                    {buildings.map((building) => (
                      <SelectItem key={building.id} value={building.id}>
                        {building.name} ({building.number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="roomPrefix" className="text-right">
                  Room Prefix
                </Label>
                <Input
                  id="roomPrefix"
                  value={roomPrefix}
                  onChange={(e) => setRoomPrefix(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="seatPrefix" className="text-right">
                  Seat Prefix
                </Label>
                <Input
                  id="seatPrefix"
                  value={seatPrefix}
                  onChange={(e) => setSeatPrefix(e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="studentsPerRoom" className="text-right">
                  Students Per Room
                </Label>
                <Input
                  id="studentsPerRoom"
                  type="number"
                  min="1"
                  value={studentsPerRoom}
                  onChange={(e) => setStudentsPerRoom(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label className="text-right pt-2">Select Rooms</Label>
                <div className="col-span-3 border rounded-md p-4 max-h-60 overflow-y-auto">
                  {filteredRooms.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No rooms available</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredRooms.map((room) => (
                        <div key={room.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`room-${room.id}`}
                            checked={selectedRoomIds.includes(room.id)}
                            onChange={() => handleRoomToggle(room.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <label htmlFor={`room-${room.id}`} className="text-sm">
                            {room.building?.name} - Room {room.roomNumber} (Floor {room.floor}, Capacity: {room.capacity})
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {selectedRoomIds.length > 0 && (
                <div className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2">Assign Invigilators</Label>
                  <div className="col-span-3 border rounded-md p-4 max-h-60 overflow-y-auto">
                    <div className="space-y-3">
                      {selectedRoomIds.map((roomId) => {
                        const room = rooms.find(r => r.id === roomId);
                        const roomInvigilator = roomInvigilators.find(ri => ri.roomId === roomId);
                        return (
                          <div key={`invig-${roomId}`} className="grid grid-cols-2 gap-2 items-center">
                            <div className="text-sm font-medium">
                              {room?.building?.name} - Room {room?.roomNumber}:
                            </div>
                            <Select 
                              value={roomInvigilator?.invigilatorId || "none"}
                              onValueChange={(value) => handleUpdateRoomInvigilator(roomId, value === "none" ? "" : value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select invigilator" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {facultyUsers.map((faculty) => (
                                  <SelectItem key={faculty.id} value={faculty.id}>
                                    {faculty.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleGenerateSeating} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Seating"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
