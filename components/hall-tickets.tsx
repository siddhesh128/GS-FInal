"use client"

import { useState } from "react"
import { format } from "date-fns"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"

interface HallTicket {
  id: string
  examId: string
  studentId: string
  examTitle: string
  courseCode: string
  date: string
  startTime: string
  endTime: string
  location: string
  status: string
  subjects?: {
    id: string
    name: string
    code: string
    schedule?: {
      date: string
      startTime: string
      endTime: string
    }
  }[]
}

interface HallTicketsProps {
  tickets: HallTicket[]
}

export function HallTickets({ tickets }: HallTicketsProps) {
  const { toast } = useToast()
  const [isDownloading, setIsDownloading] = useState<string | null>(null)

  const handleDownload = async (ticket: HallTicket) => {
    if (ticket.status !== "Ready for download") {
      toast({
        title: "Cannot download hall ticket",
        description: "Seating arrangement not assigned yet",
        variant: "destructive",
      })
      return
    }

    setIsDownloading(ticket.id)

    try {
      // The ticket.id might already be in the format examId_studentId,
      // so use it directly instead of trying to construct it
      const downloadId = ticket.examId + "_" + ticket.studentId
      
      console.log("Attempting to download hall ticket with ID:", downloadId)
      
      const response = await fetch(`/api/hall-tickets/${downloadId}/download`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to download hall ticket")
      }

      // Get the response data
      const data = await response.json()
      
      if (!data.pdfDataUri) {
        throw new Error("No PDF data received from server")
      }

      // Create a link element and trigger download
      const link = document.createElement("a")
      link.href = data.pdfDataUri
      link.download = `Hall_Ticket_${ticket.examTitle.replace(/\s+/g, "_")}.pdf`
      
      // For debugging
      console.log("Generated link with PDF data")
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Hall ticket downloaded",
        description: `Hall ticket for ${ticket.examTitle} has been downloaded`,
      })
    } catch (error) {
      console.error("Download error:", error)
      toast({
        variant: "destructive",
        title: "Download failed",
        description: error instanceof Error ? error.message : "Something went wrong",
      })
    } finally {
      setIsDownloading(null)
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center">
        <h3 className="text-lg font-medium">No hall tickets available</h3>
        <p className="text-sm text-muted-foreground">You don't have any hall tickets available for download yet.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {tickets.map((ticket, index) => (
        <Card key={`${ticket.examId}_${ticket.id}_${index}`}>
          <CardHeader>
            <CardTitle>{ticket.examTitle}</CardTitle>
            <CardDescription>{ticket.courseCode}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm font-medium">Date:</span>
              <span className="text-sm">{format(new Date(ticket.date), "PPP")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Time:</span>
              <span className="text-sm">{`${ticket.startTime} - ${ticket.endTime}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Location:</span>
              <span className="text-sm">{ticket.location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Status:</span>
              <span
                className={`text-sm ${ticket.status === "Ready for download" ? "text-green-500" : "text-amber-500"}`}
              >
                {ticket.status}
              </span>
            </div>
            
            {/* Subject-specific schedules */}
            {ticket.subjects && ticket.subjects.length > 0 && (
              <div className="mt-3 border-t pt-3">
                <h4 className="text-sm font-medium mb-2">Subject Schedules:</h4>
                <div className="space-y-2">
                  {ticket.subjects.map(subject => (
                    <div key={subject.id} className="rounded-md bg-muted p-2 text-xs">
                      <div className="font-medium">{subject.name} ({subject.code})</div>
                      {subject.schedule ? (
                        <div className="mt-1 text-muted-foreground">
                          <div>Date: {format(new Date(subject.schedule.date), "PPP")}</div>
                          <div>Time: {subject.schedule.startTime} - {subject.schedule.endTime}</div>
                        </div>
                      ) : (
                        <div className="mt-1 text-muted-foreground">Using main exam schedule</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => handleDownload(ticket)}
              disabled={ticket.status !== "Ready for download" || isDownloading === ticket.id}
            >
              <Download className="mr-2 h-4 w-4" />
              {isDownloading === ticket.id ? "Downloading..." : "Download Hall Ticket"}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
