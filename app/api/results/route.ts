import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { examResults } from "@/lib/db/schema"

const resultSchema = z.object({
  examId: z.string().uuid(),
  studentId: z.string().uuid(),
  score: z.string(),
  grade: z.string(),
  feedback: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    let results

    if (session.user.role === "ADMIN") {
      // Admins can see all results
      results = await db.query.examResults.findMany({
        with: {
          exam: true,
          student: {
            columns: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: (examResults, { desc }) => [desc(examResults.createdAt)],
      })
    } else if (session.user.role === "FACULTY") {
      // Faculty can see results for exams they're assigned to
      results = await db.query.examResults.findMany({
        with: {
          exam: {
            where: (exams, { eq }) => eq(exams.invigilatorId, session.user.id),
          },
          student: {
            columns: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: (examResults, { desc }) => [desc(examResults.createdAt)],
      })

      // Filter out results where exam is null (not assigned to this faculty)
      results = results.filter((result) => result.exam !== null)
    } else {
      // Students can only see their own results
      results = await db.query.examResults.findMany({
        where: (examResults, { eq }) => eq(examResults.studentId, session.user.id),
        with: {
          exam: true,
        },
        orderBy: (examResults, { desc }) => [desc(examResults.createdAt)],
      })
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error("Error fetching results:", error)
    return NextResponse.json({ message: "An error occurred while fetching results" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = resultSchema.parse(body)

    // Check if result already exists
    const existingResult = await db.query.examResults.findFirst({
      where: (examResults, { and, eq }) =>
        and(eq(examResults.examId, validatedData.examId), eq(examResults.studentId, validatedData.studentId)),
    })

    if (existingResult) {
      return NextResponse.json({ message: "Result already exists for this student and exam" }, { status: 409 })
    }

    // Create new result
    const newResult = await db
      .insert(examResults)
      .values({
        examId: validatedData.examId,
        studentId: validatedData.studentId,
        score: validatedData.score,
        grade: validatedData.grade,
        feedback: validatedData.feedback || "",
      })
      .returning()

    return NextResponse.json(newResult[0], { status: 201 })
  } catch (error) {
    console.error("Error creating result:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while creating the result" }, { status: 500 })
  }
}
