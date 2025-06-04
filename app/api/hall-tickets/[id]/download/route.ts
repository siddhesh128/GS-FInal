import { type NextRequest, NextResponse } from "next/server"
import { and, eq } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { enrollments, seatingArrangements, users } from "@/lib/db/schema"
import { generateHallTicket } from "@/lib/generate-hall-ticket"

// In Next.js App Router, params are already passed as an argument
export async function GET(
  request: NextRequest, 
  context: { params: { id: string } }
) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Only students can download their own hall tickets
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Only students can download hall tickets" }, { status: 403 })
    }

    // Access id directly through destructuring to avoid the params.id error
    const { id } = context.params;
    
    if (!id) {
      return NextResponse.json({ message: "Missing ID parameter" }, { status: 400 })
    }

    // Split the composite ID to get examId and studentId
    const idParts = id.split('_');
    
    if (idParts.length !== 2) {
      console.error("Invalid ID format:", id);
      return NextResponse.json({ message: "Invalid ID format. Expected format: examId_studentId" }, { status: 400 })
    }
    
    const [examId, studentId] = idParts;

    // Get the enrollment
    const enrollment = await db.query.enrollments.findFirst({
      where: (enrollments, { and, eq }) => 
        and(eq(enrollments.examId, examId), eq(enrollments.studentId, studentId)),
      with: {
        exam: true,
        student: true,
      }
    })

    if (!enrollment) {
      return NextResponse.json({ message: "Enrollment not found" }, { status: 404 })
    }

    // Students can only download their own hall tickets
    if (enrollment.studentId !== session.user.id) {
      return NextResponse.json({ message: "You can only download your own hall tickets" }, { status: 403 })
    }

    // Get seating arrangement separately
    const seating = await db.query.seatingArrangements.findFirst({
      where: (sa, { and, eq }) => 
        and(eq(sa.examId, examId), eq(sa.studentId, studentId)),
      with: {
        room: {
          with: {
            building: true
          }
        },
        invigilator: {
          columns: {
            id: true,
            name: true, 
            email: true,
          }
        }
      }
    })

    // Check if seating arrangement exists
    if (!seating) {
      return NextResponse.json({ message: "Seating arrangement not assigned yet" }, { status: 400 })
    }
    
    // Get subject information for this exam
    const examSubjectsData = await db.query.examSubjects.findMany({
      where: (es, { eq }) => eq(es.examId, examId),
      with: { subject: true },
    });
    
    // Get subject schedules if any
    const subjectSchedulesData = await db.query.subjectSchedules.findMany({
      where: (ss, { eq }) => eq(ss.examId, examId),
    });
    
    // Format subjects with their schedules for the hall ticket (without seating details)
    const subjectsForHallTicket = examSubjectsData.map(es => {
      // Find schedule for this subject if exists
      const schedule = subjectSchedulesData.find(
        ss => ss.subjectId === es.subjectId
      );
      
      return {
        subjectName: es.subject.name,
        subjectCode: es.subject.code,
        date: schedule ? new Date(schedule.date) : new Date(enrollment.exam.date),
        startTime: schedule ? schedule.startTime : enrollment.exam.startTime,
        endTime: schedule ? schedule.endTime : enrollment.exam.endTime,
        hasCustomSchedule: !!schedule
      };
    });

    // Generate hall ticket
    const hallTicketData = {
      studentName: enrollment.student.name,
      studentId: enrollment.studentId,
      examTitle: enrollment.exam.title,
      courseCode: enrollment.exam.description || "No Code",
      date: new Date(enrollment.exam.date),
      startTime: enrollment.exam.startTime,
      endTime: enrollment.exam.endTime,
      location: enrollment.exam.location || "TBD",
      subjects: subjectsForHallTicket,
    }

    const pdfDataUri = generateHallTicket(hallTicketData)

    // Return the PDF data URI
    return NextResponse.json({ pdfDataUri })
  } catch (error) {
    console.error("Error generating hall ticket:", error)
    return NextResponse.json({ message: "An error occurred while generating the hall ticket" }, { status: 500 })
  }
}
