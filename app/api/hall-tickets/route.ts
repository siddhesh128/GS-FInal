import { type NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ message: "Only students can access hall tickets" }, { status: 403 })
    }

    // Get all exams the student is enrolled in
    const studentEnrollments = await db.query.enrollments.findMany({
      where: (enrollments, { eq }) => eq(enrollments.studentId, session.user.id),
      with: {
        exam: true,
      },
    })

    // Get seating arrangements separately
    const seatingArrangements = await db.query.seatingArrangements.findMany({
      where: (sa, { eq }) => eq(sa.studentId, session.user.id),
      with: {
        room: true,
      },
    })

    // Create a map of seating arrangements for quick lookup
    const seatingMap = new Map();
    for (const seating of seatingArrangements) {
      // Create a composite key of examId_studentId
      const key = `${seating.examId}_${seating.studentId}`;
      seatingMap.set(key, seating);
    }

    // Format hall tickets data
    const hallTickets = studentEnrollments.map((enrollment) => {
      // Look up seating arrangement for this enrollment
      const key = `${enrollment.examId}_${enrollment.studentId}`;
      const seating = seatingMap.get(key);

      // Construct ID in the format expected by the download endpoint
      const ticketId = `${enrollment.examId}_${enrollment.studentId}`;
      
      return {
        id: ticketId,
        examId: enrollment.examId,
        studentId: enrollment.studentId,
        examTitle: enrollment.exam.title,
        courseCode: enrollment.exam.description || "No code", // Using description as courseCode
        date: enrollment.exam.date,
        startTime: enrollment.exam.startTime,
        endTime: enrollment.exam.endTime,
        location: enrollment.exam.location || "TBD",
        roomNumber: seating?.room?.roomNumber || "Not assigned",
        seatNumber: seating?.seatNumber || "Not assigned",
        status: seating ? "Ready for download" : "Pending seating assignment",
      };
    });

    return NextResponse.json(hallTickets)
  } catch (error) {
    console.error("Error fetching hall tickets:", error)
    return NextResponse.json({ message: "An error occurred while fetching hall tickets" }, { status: 500 })
  }
}
