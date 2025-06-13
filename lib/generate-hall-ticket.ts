import { jsPDF } from "jspdf"
import { format } from "date-fns"

interface SubjectInfo {
  subjectName: string
  subjectCode: string
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
  subjects: SubjectInfo[]
}

export function generateHallTicket(data: HallTicketData): string {
  // Create a new PDF document
  const doc = new jsPDF()

  // Set font styles
  doc.setFont("helvetica", "bold")
  doc.setFontSize(18)

  // Add title
  doc.text("EXAMINATION HALL TICKET", 105, 20, { align: "center" })

  // Add institution name (reduced gap from title)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("University Examination Department", 105, 30, { align: "center" })

  // Add horizontal line
  doc.setLineWidth(0.5)
  doc.line(20, 40, 190, 40)

  // Student details (smaller font size)
  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("Student Name:", 20, 55)
  doc.text("Student ID:", 20, 65)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(data.studentName, 80, 55)
  doc.text(data.studentId, 80, 65)

  // Exam details
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("Examination Details", 105, 80, { align: "center" })

  doc.setFont("helvetica", "normal")
  doc.setFontSize(10)
  doc.text("Exam:", 20, 95)
  doc.text("Course Code:", 20, 105)
  doc.text("Date:", 20, 115)
  doc.text("Time:", 20, 125)
  doc.text("Location:", 20, 135)

  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text(data.examTitle, 80, 95)
  doc.text(data.courseCode, 80, 105)
  doc.text(format(data.date, "PPP"), 80, 115)
  doc.text(`${data.startTime} - ${data.endTime}`, 80, 125)
  doc.text(data.location, 80, 135)

  doc.setFont("helvetica", "bold")
  doc.text(data.examTitle, 80, 95)
  doc.text(data.courseCode, 80, 105)
  doc.text(format(data.date, "PPP"), 80, 115)
  doc.text(`${data.startTime} - ${data.endTime}`, 80, 125)
  doc.text(data.location, 80, 135)

  // Subject details (without seating information)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(14)
  doc.text("Subject Details", 105, 155, { align: "center" })

  // Create a table for subjects
  doc.setFont("helvetica", "bold")
  doc.setFontSize(10)
  doc.text("Subject", 20, 165)
  doc.text("Code", 80, 165)
  doc.text("Date", 120, 165)
  doc.text("Time", 160, 165)

  // Add horizontal line below headers
  doc.setLineWidth(0.2)
  doc.line(20, 167, 190, 167)

  // Add subject data (without seating details)
  doc.setFont("helvetica", "normal")
  let yPos = 175
  data.subjects.forEach((subject, index) => {
    // Add a new page if we're running out of space
    if (yPos > 270) {
      doc.addPage()
      yPos = 30

      // Add headers on new page
      doc.setFont("helvetica", "bold")
      doc.text("Subject", 20, yPos)
      doc.text("Code", 80, yPos)
      doc.text("Date", 120, yPos)
      doc.text("Time", 160, yPos)

      // Add horizontal line below headers
      doc.line(20, yPos + 2, 190, yPos + 2)

      yPos += 10
      doc.setFont("helvetica", "normal")
    }

    doc.text(subject.subjectName, 20, yPos)
    doc.text(subject.subjectCode, 80, yPos)
    
    // Show subject-specific schedule if available, otherwise show exam schedule
    if (subject.hasCustomSchedule) {
      doc.text(format(subject.date, "MMM dd"), 120, yPos)
      doc.text(`${subject.startTime} - ${subject.endTime}`, 160, yPos)
    } else {
      doc.text(format(data.date, "MMM dd"), 120, yPos)
      doc.text(`${data.startTime} - ${data.endTime}`, 160, yPos)
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
    "6. Check your seating arrangement 30 minutes before the exam starts.",
    "7. Report to the examination center at least 15 minutes before exam time.",
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
