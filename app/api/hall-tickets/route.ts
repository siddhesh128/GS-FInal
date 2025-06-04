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

    // Get exam subjects for all exams the student is enrolled in
    const examIds = studentEnrollments.map(enrollment => enrollment.examId);
    
    // Get all exam subjects for these exams
    const examSubjects = await db.query.examSubjects.findMany({
      where: (es, { inArray }) => inArray(es.examId, examIds),
      with: { subject: true },
    });
    
    // Get all subject schedules for these exams
    const subjectSchedules = await db.query.subjectSchedules.findMany({
      where: (ss, { inArray }) => inArray(ss.examId, examIds),
    });

    // Create maps for quick lookups
    const seatingMap = new Map();
    for (const seating of seatingArrangements) {
      // Create a composite key of examId_studentId
      const key = `${seating.examId}_${seating.studentId}`;
      seatingMap.set(key, seating);
    }
    
    // Group subjects and schedules by exam
    const subjectsByExam = new Map();
    for (const es of examSubjects) {
      if (!subjectsByExam.has(es.examId)) {
        subjectsByExam.set(es.examId, []);
      }
      
      // Find schedule for this subject if it exists
      const schedule = subjectSchedules.find(
        ss => ss.examId === es.examId && ss.subjectId === es.subjectId
      );
      
      subjectsByExam.get(es.examId).push({
        id: es.subject.id,
        name: es.subject.name,
        code: es.subject.code,
        schedule: schedule ? {
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        } : undefined
      });
    }

    // Format hall tickets data
    const hallTickets = studentEnrollments.map((enrollment) => {
      // Look up seating arrangement for this enrollment
      const key = `${enrollment.examId}_${enrollment.studentId}`;
      const seating = seatingMap.get(key);
      
      // Get subjects for this exam
      const subjects = subjectsByExam.get(enrollment.examId) || [];

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
        status: seating ? "Ready for download" : "Pending seating assignment",
        subjects: subjects
      };
    });

    return NextResponse.json(hallTickets)
  } catch (error) {
    console.error("Error fetching hall tickets:", error)
    return NextResponse.json({ message: "An error occurred while fetching hall tickets" }, { status: 500 })
  }
}
