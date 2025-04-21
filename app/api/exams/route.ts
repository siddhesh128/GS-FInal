import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams, examSubjects } from "@/lib/db/schema"

const examSchema = z.object({
  title: z.string().min(2),
  courseCode: z.string().min(2),
  date: z.coerce.date(),
  startTime: z.string(),
  endTime: z.string(),
  location: z.string().min(2),
  subjectIds: z.array(z.string().uuid()).min(1, "At least one subject must be selected"),
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
        let invigilator = null
        if (exam.invigilatorId) {
          invigilator = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, exam.invigilatorId as string),
            columns: { id: true, name: true, email: true },
          })
        }
        examsList.push({
          ...exam,
          invigilator,
          subjects: subjectData.map(es => es.subject),
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
        let invigilator = null
        if (exam.invigilatorId) {
          invigilator = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, exam.invigilatorId as string),
            columns: { id: true, name: true, email: true },
          })
        }
        examsList.push({
          ...exam,
          invigilator,
          subjects: subjectData.map(es => es.subject),
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
        let invigilator = null
        if (exam.invigilatorId) {
          invigilator = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, exam.invigilatorId as string),
            columns: { id: true, name: true, email: true },
          })
        }
        examsList.push({
          ...exam,
          invigilator,
          subjects: subjectData.map(es => es.subject),
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

    // Create new exam
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
      .returning()

    // Create exam-subject relationships
    const examSubjectsData = validatedData.subjectIds.map((subjectId) => ({
      examId: newExam[0].id,
      subjectId,
    }))

    await db.insert(examSubjects).values(examSubjectsData)

    // Fetch the created exam with subjects
    const createdExam = await db.query.exams.findFirst({
      where: (exams, { eq }) => eq(exams.id, newExam[0].id),
      with: {
        examSubjects: {
          with: {
            subject: true,
          },
        },
      },
    })

    // Transform the data to include subjects directly
    const responseExam = {
      ...createdExam,
      subjects: createdExam?.examSubjects?.map((es: any) => es.subject) || [],
    }

    return NextResponse.json(responseExam, { status: 201 })
  } catch (error) {
    console.error("Error creating exam:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while creating the exam" }, { status: 500 })
  }
}
