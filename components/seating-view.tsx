"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { Search, Download, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"

interface Exam {
  id: string
  title: string
  date: string
}

interface Subject {
  id: string
  name: string
  code: string
}

interface Building {
  id: string
  name: string
  number: string
}

interface Room {
  id: string
  roomNumber: string
  floor: string
  building: Building
}

interface Student {
  id: string
  name: string
  email: string
}

interface SeatingArrangement {
  id: string
  examId: string
  subjectId: string
  studentId: string
  roomId: string
  seatNumber: string
  invigilatorId?: string
  exam: Exam
  subject: Subject | null
  student: Student
  room: Room
  invigilator?: {
    id: string
    name: string
    email: string
  } | null
  subjectSchedule?: {
    date: string
    startTime: string
    endTime: string
  } | null
}

interface SeatingViewProps {
  initialSeatingArrangements: SeatingArrangement[]
  exams: Exam[]
  subjects: Subject[]
  buildings: Building[]
}

export function SeatingView({ initialSeatingArrangements, exams, subjects, buildings }: SeatingViewProps) {
  const { toast } = useToast()
  const [seatingArrangements, setSeatingArrangements] = useState<SeatingArrangement[]>(initialSeatingArrangements)
  const [filteredArrangements, setFilteredArrangements] = useState<SeatingArrangement[]>(initialSeatingArrangements)
  const [selectedExamId, setSelectedExamId] = useState<string>("")
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("")
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [page, setPage] = useState<number>(1)
  const [totalPages, setTotalPages] = useState<number>(1)
  const [totalRecords, setTotalRecords] = useState<number>(initialSeatingArrangements.length)
  const pageSize = 50

  // Apply filters when they change
  useEffect(() => {
    const fetchFilteredData = async () => {
      setIsLoading(true)
      try {
        let url = `/api/seating/view?page=${page}&pageSize=${pageSize}`

        if (selectedExamId) {
          url += `&examId=${selectedExamId}`
        }

        if (selectedSubjectId) {
          url += `&subjectId=${selectedSubjectId}`
        }

        if (selectedBuildingId) {
          url += `&buildingId=${selectedBuildingId}`
        }

        if (searchQuery) {
          url += `&search=${encodeURIComponent(searchQuery)}`
        }

        const response = await fetch(url)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || "Failed to fetch seating arrangements")
        }

        const data = await response.json()
        setSeatingArrangements(data.items || [])
        setFilteredArrangements(data.items || [])
        setTotalPages(data.totalPages || 1)
        setTotalRecords(data.totalRecords || 0)
      } catch (error) {
        console.error("Error fetching seating arrangements:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch seating arrangements",
        })
        // Set empty arrays to prevent undefined errors
        setSeatingArrangements([])
        setFilteredArrangements([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchFilteredData()
  }, [selectedExamId, selectedSubjectId, selectedBuildingId, searchQuery, page, toast])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1) // Reset to first page when searching
  }

  const handleExportCSV = () => {
    // Create CSV content
    const headers = ["Exam", "Date", "Subject", "Student Name", "Student Email", "Building", "Room", "Floor", "Seat", "Invigilator Name", "Invigilator Email"]

    const rows = filteredArrangements.map((arrangement) => [
      arrangement.exam.title,
      arrangement.subjectSchedule 
        ? format(new Date(arrangement.subjectSchedule.date), "yyyy-MM-dd")
        : format(new Date(arrangement.exam.date), "yyyy-MM-dd"),
      arrangement.subject ? `${arrangement.subject.name} (${arrangement.subject.code})` : "N/A",
      arrangement.student.name,
      arrangement.student.email,
      `${arrangement.room.building.name} (${arrangement.room.building.number})`,
      arrangement.room.roomNumber,
      arrangement.room.floor,
      arrangement.seatNumber,
      arrangement.invigilator ? arrangement.invigilator.name : "N/A",
      arrangement.invigilator ? arrangement.invigilator.email : "N/A",
    ])
    const csvContent =
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) =>
              typeof cell === "string" && (cell.includes(",") || cell.includes('"') || cell.includes("\n"))
                ? `"${cell.replace(/"/g, '""')}"`
                : cell
            )
            .join(",")
        )
        .join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.setAttribute("download", `seating-arrangements-${new Date().toISOString().split("T")[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleRefresh = () => {
    setPage(1)
    setSelectedExamId("")
    setSelectedSubjectId("")
    setSelectedBuildingId("")
    setSearchQuery("")
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-2">
              <Label htmlFor="exam">Exam</Label>
              <Select
                value={selectedExamId}
                onValueChange={(value) => {
                  setSelectedExamId(value)
                  setPage(1)
                }}
              >
                <SelectTrigger id="exam">
                  <SelectValue placeholder="All exams" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All exams</SelectItem>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.title} - {format(new Date(exam.date), "PPP")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select
                value={selectedSubjectId}
                onValueChange={(value) => {
                  setSelectedSubjectId(value)
                  setPage(1)
                }}
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="building">Building</Label>
              <Select
                value={selectedBuildingId}
                onValueChange={(value) => {
                  setSelectedBuildingId(value)
                  setPage(1)
                }}
              >
                <SelectTrigger id="building">
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

            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="search"
                  placeholder="Search by student name or email..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-end space-x-2">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Loading..." : "Apply Filters"}
              </Button>
              <Button type="button" variant="outline" onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredArrangements.length} of {totalRecords} total records
        </p>
        <Button variant="outline" onClick={handleExportCSV} disabled={filteredArrangements.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {filteredArrangements.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <h3 className="text-lg font-medium">No seating arrangements found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your filters or create seating arrangements first.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Exam</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Seat</TableHead>
                  <TableHead>Invigilator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredArrangements.map((arrangement) => (
                  <TableRow key={arrangement.id}>
                    <TableCell>{arrangement.exam.title}</TableCell>
                    <TableCell>
                      {arrangement.subjectSchedule 
                        ? format(new Date(arrangement.subjectSchedule.date), "PPP")
                        : format(new Date(arrangement.exam.date), "PPP")}
                    </TableCell>
                    <TableCell>
                      {arrangement.subject ? (
                        `${arrangement.subject.name} (${arrangement.subject.code})`
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{arrangement.student.name}</div>
                        <div className="text-sm text-muted-foreground">{arrangement.student.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {arrangement.room.building.name} ({arrangement.room.building.number})
                    </TableCell>
                    <TableCell>{arrangement.room.roomNumber}</TableCell>
                    <TableCell>{arrangement.room.floor}</TableCell>
                    <TableCell>{arrangement.seatNumber}</TableCell>
                    <TableCell>
                      {arrangement.invigilator ? (
                        <div>
                          <div className="font-medium">{arrangement.invigilator.name}</div>
                          <div className="text-sm text-muted-foreground">{arrangement.invigilator.email}</div>
                        </div>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page === 1 || isLoading}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages || isLoading}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
