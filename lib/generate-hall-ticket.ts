import { jsPDF } from "jspdf"
import { format } from "date-fns"

interface SubjectSeating {
  subjectName: string
  subjectCode: string
  roomNumber: string
  buildingName: string
  buildingNumber: string
  floor: string
  seatNumber: string
  invigilatorName: string
  invigilatorEmail: string
  date: Date
  startTime: string
  endTime: string
  hasCustomSchedule?: boolean
}

interface HallTicketData {
  studentName: string
  studentId: string
  examTitle: string
  courseCode: string
  date: Date
  startTime: string
  endTime: string
  location: string
  subjects: SubjectSeating[]
}

export function generateHallTicket(data: HallTicketData): string {
  // Create a new PDF document
  const doc = new jsPDF()

  // Set font styles
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)

  // Add title
  doc.text("EXAMINATION HALL TICKET", 105, 20, { align: "center" })

  // Add logo placeholder
  doc.rect(20, 30, 30, 30)
  doc.setFontSize(8)
  doc.text("LOGO", 35, 45, { align: "center" })

  // Add institution name
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("University Examination Department", 105, 40, { align: "center" })

  // Add horizontal line
  doc.setLineWidth(0.5)
  doc.line(20, 50, 190, 50)

  // Student details
  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.text("Student Name:", 20, 65)
  doc.text("Student ID:", 20, 75)

  doc.setFont("helvetica", "bold")
  doc.text(data.studentName, 80, 65)
  doc.text(data.studentId, 80, 75)

  // Exam details
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("Examination Details", 105, 90, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(12)
  doc.text("Exam:", 20, 105)
  doc.text("Course Code:", 20, 115)
  doc.text("Date:", 20, 125)
  doc.text("Time:", 20, 135)
  doc.text("Location:", 20, 145)

  doc.setFont("helvetica", "bold")
  doc.text(data.examTitle, 80, 105)
  doc.text(data.courseCode, 80, 115)
  doc.text(format(data.date, "PPP"), 80, 125)
  doc.text(`${data.startTime} - ${data.endTime}`, 80, 135)
  doc.text(data.location, 80, 145)

  // Subject-wise seating details
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("Subject-wise Seating Arrangements", 105, 165, { align: "center" })

  // Create a table for subject seating
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Subject", 20, 175)
  doc.text("Code", 60, 175)
  doc.text("Building", 85, 175)
  doc.text("Room", 125, 175)
  doc.text("Floor", 150, 175)
  doc.text("Seat", 175, 175)

  // Add horizontal line below headers
  doc.setLineWidth(0.2)
  doc.line(20, 177, 190, 177)

  // Add subject seating data
  doc.setFont("helvetica", "normal")
  let yPos = 185
  data.subjects.forEach((subject, index) => {
    // Add a new page if we're running out of space
    if (yPos > 270) {
      doc.addPage()
      yPos = 30

      // Add headers on new page
      doc.setFont("helvetica", "bold")
      doc.text("Subject", 20, yPos)
      doc.text("Code", 60, yPos)
      doc.text("Building", 85, yPos)
      doc.text("Room", 125, yPos)
      doc.text("Floor", 150, yPos)
      doc.text("Seat", 175, yPos)

      // Add horizontal line below headers
      doc.line(20, yPos + 2, 190, yPos + 2)

      yPos += 10
      doc.setFont("helvetica", "normal")
    }

    doc.text(subject.subjectName, 20, yPos)
    doc.text(subject.subjectCode, 60, yPos)
    doc.text(`${subject.buildingName} (${subject.buildingNumber})`, 85, yPos)
    doc.text(subject.roomNumber, 125, yPos)
    doc.text(subject.floor, 150, yPos)
    doc.text(subject.seatNumber, 175, yPos)

    // Add subject-specific schedule if available
    if (subject.hasCustomSchedule) {
      yPos += 10
      doc.setFont("helvetica", "bold")
      doc.text("Schedule:", 20, yPos)
      doc.setFont("helvetica", "normal")
      doc.text(`${format(subject.date, "PPP")} ${subject.startTime} - ${subject.endTime}`, 60, yPos)
    }

    // Add a light line between rows
    if (index < data.subjects.length - 1) {
      doc.setDrawColor(200, 200, 200)
      doc.line(20, yPos + 2, 190, yPos + 2)
      doc.setDrawColor(0, 0, 0)
    }

    yPos += 10
  })

  // Instructions
  yPos += 10
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("Instructions", 105, yPos, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  const instructions = [
    "1. Bring this hall ticket and a valid ID to the examination.",
    "2. Arrive at least 30 minutes before the examination starts.",
    "3. No electronic devices are allowed in the examination hall.",
    "4. Follow all instructions given by the invigilator.",
    "5. This hall ticket is valid only for the mentioned examination.",
    "6. Check the subject-specific room and seat number for each exam.",
  ]

  yPos += 10
  instructions.forEach((instruction) => {
    // Add a new page if we're running out of space
    if (yPos > 270) {
      doc.addPage()
      yPos = 30
    }

    doc.text(instruction, 20, yPos)
    yPos += 10
  })

  // Signature
  if (yPos > 250) {
    doc.addPage()
    yPos = 30
  } else {
    yPos = 270
  }

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("Authorized Signature", 150, yPos)
  doc.line(130, yPos - 5, 170, yPos - 5)

  // Convert to base64
  return doc.output("datauristring")
}
