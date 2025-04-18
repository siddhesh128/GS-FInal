import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { subjects } from "@/lib/db/schema"

const subjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const allSubjects = await db.query.subjects.findMany({
      orderBy: (subjects, { asc }) => [asc(subjects.name)],
    })

    return NextResponse.json(allSubjects)
  } catch (error) {
    console.error("Error fetching subjects:", error)
    return NextResponse.json({ message: "An error occurred while fetching subjects" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = subjectSchema.parse(body)

    // Check if subject code already exists
    const existingSubject = await db.query.subjects.findFirst({
      where: (subjects, { eq }) => eq(subjects.code, validatedData.code),
    })

    if (existingSubject) {
      return NextResponse.json({ message: "Subject code already exists" }, { status: 400 })
    }

    // Create new subject
    const newSubject = await db
      .insert(subjects)
      .values({
        name: validatedData.name,
        code: validatedData.code,
        description: validatedData.description,
      })
      .returning()

    return NextResponse.json(newSubject[0], { status: 201 })
  } catch (error) {
    console.error("Error creating subject:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while creating the subject" }, { status: 500 })
  }
}
