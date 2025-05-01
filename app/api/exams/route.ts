import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams, examSubjects, subjectSchedules } from "@/lib/db/schema"

// Schema for subject schedules
const subjectScheduleSchema = z.object({
  subjectId: z.string().uuid(),
  date: z.string().or(z.date()),
  startTime: z.string(),
  endTime: z.string(),
})

const examSchema = z.object({
  title: z.string().min(2),
  courseCode: z.string().min(2),
  date: z.coerce.date(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().min(2),
  subjectIds: z.array(z.string().uuid()).min(1, "At least one subject must be selected"),
  // Optional subject schedules
  subjectSchedules: z.array(subjectScheduleSchema).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    let examsList: any[] = []

    if (session.user.role === "ADMIN") {
      const examsData = await db.query.exams.findMany({
        orderBy: (exams, { desc }) => [desc(exams.date)],
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
      for (const exam of examsData) {
        const subjectData = await db.query.examSubjects.findMany({
          where: (es, { eq }) => eq(es.examId, exam.id),
          with: { subject: true },
        })
        
        // Get subject schedules if any
        const scheduleData = await db.query.subjectSchedules.findMany({
          where: (ss, { eq }) => eq(ss.examId, exam.id),
        })
        
        examsList.push({
          ...exam,
          subjects: subjectData.map(es => es.subject),
          subjectSchedules: scheduleData.length > 0 ? scheduleData : undefined,
        })
      }
    } else if (session.user.role === "FACULTY") {
      const examsData = await db.query.exams.findMany({
        where: (exams, { eq }) => eq(exams.createdBy, session.user.id),
        orderBy: (exams, { desc }) => [desc(exams.date)],
      })
      for (const exam of examsData) {
        const subjectData = await db.query.examSubjects.findMany({
          where: (es, { eq }) => eq(es.examId, exam.id),
          with: { subject: true },
        })
        
        // Get subject schedules if any
        const scheduleData = await db.query.subjectSchedules.findMany({
          where: (ss, { eq }) => eq(ss.examId, exam.id),
        })
        
        examsList.push({
          ...exam,
          subjects: subjectData.map(es => es.subject),
          subjectSchedules: scheduleData.length > 0 ? scheduleData : undefined,
        })
      }
    } else {
      const enrollments = await db.query.enrollments.findMany({
        where: (enrollments, { eq }) => eq(enrollments.studentId, session.user.id),
        with: {
          exam: true,
        },
      })
      for (const enrollment of enrollments) {
        const exam = enrollment.exam
        if (!exam) continue
        const subjectData = await db.query.examSubjects.findMany({
          where: (es, { eq }) => eq(es.examId, exam.id),
          with: { subject: true },
        })
        
        // Get subject schedules if any
        const scheduleData = await db.query.subjectSchedules.findMany({
          where: (ss, { eq }) => eq(ss.examId, exam.id),
        })
        
        examsList.push({
          ...exam,
          subjects: subjectData.map(es => es.subject),
          subjectSchedules: scheduleData.length > 0 ? scheduleData : undefined,
        })
      }
    }

    return NextResponse.json(examsList)
  } catch (error) {
    console.error("Error fetching exams:", error)
    return NextResponse.json({ message: "An error occurred while fetching exams" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = examSchema.parse(body)

    // Create new exam without using transactions
    const newExam = await db
      .insert(exams)
      .values({
        title: validatedData.title,
        date: new Date(validatedData.date),
        startTime: validatedData.startTime,
        endTime: validatedData.endTime,
        location: validatedData.location,
        createdBy: session.user.id,
        description: validatedData.courseCode, // Using description field for courseCode
      })
      .returning();

    if (!newExam[0]) {
      throw new Error("Failed to create exam");
    }
    
    // Create exam-subject relationships
    const examSubjectsData = validatedData.subjectIds.map((subjectId) => ({
      examId: newExam[0].id,
      subjectId,
    }));

    await db.insert(examSubjects).values(examSubjectsData);

    // Create subject-specific schedules if provided
    if (validatedData.subjectSchedules && validatedData.subjectSchedules.length > 0) {
      const schedulesToInsert = validatedData.subjectSchedules.map(schedule => ({
        examId: newExam[0].id,
        subjectId: schedule.subjectId,
        date: typeof schedule.date === 'string' ? new Date(schedule.date) : schedule.date,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      }));
      
      // Insert all schedules at once
      await db.insert(subjectSchedules).values(schedulesToInsert);
    }
    
    // Fetch the created exam
    const createdExam = await db.query.exams.findFirst({
      where: (exams, { eq }) => eq(exams.id, newExam[0].id),
    });
    
    // Fetch subjects for this exam
    const subjectData = await db.query.examSubjects.findMany({
      where: (es, { eq }) => eq(es.examId, newExam[0].id),
      with: { subject: true },
    });
    
    // Fetch schedules for this exam
    const scheduleData = validatedData.subjectSchedules && validatedData.subjectSchedules.length > 0 
      ? await db.query.subjectSchedules.findMany({
          where: (ss, { eq }) => eq(ss.examId, newExam[0].id),
        })
      : [];

    // Return the complete exam data
    const result = {
      ...createdExam,
      subjects: subjectData.map(es => es.subject),
      subjectSchedules: scheduleData.length > 0 ? scheduleData : undefined,
    };

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error("Error creating exam:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while creating the exam" }, { status: 500 })
  }
}
