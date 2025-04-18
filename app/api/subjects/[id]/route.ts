import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { subjects } from "@/lib/db/schema"

const subjectSchema = z.object({
  name: z.string().min(2),
  code: z.string().min(2),
  description: z.string().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const subject = await db.query.subjects.findFirst({
      where: (subjects, { eq }) => eq(subjects.id, params.id),
    })

    if (!subject) {
      return NextResponse.json({ message: "Subject not found" }, { status: 404 })
    }

    return NextResponse.json(subject)
  } catch (error) {
    console.error("Error fetching subject:", error)
    return NextResponse.json({ message: "An error occurred while fetching the subject" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = subjectSchema.parse(body)

    // Check if subject exists
    const existingSubject = await db.query.subjects.findFirst({
      where: (subjects, { eq }) => eq(subjects.id, params.id),
    })

    if (!existingSubject) {
      return NextResponse.json({ message: "Subject not found" }, { status: 404 })
    }

    // Check if code is being changed and if it already exists
    if (validatedData.code !== existingSubject.code) {
      const codeExists = await db.query.subjects.findFirst({
        where: (subjects, { eq }) => eq(subjects.code, validatedData.code),
      })

      if (codeExists) {
        return NextResponse.json({ message: "Subject code already exists" }, { status: 400 })
      }
    }

    // Update subject
    const updatedSubject = await db
      .update(subjects)
      .set({
        name: validatedData.name,
        code: validatedData.code,
        description: validatedData.description,
        updatedAt: new Date(),
      })
      .where(eq(subjects.id, params.id))
      .returning()

    return NextResponse.json(updatedSubject[0])
  } catch (error) {
    console.error("Error updating subject:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while updating the subject" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Check if subject exists
    const existingSubject = await db.query.subjects.findFirst({
      where: (subjects, { eq }) => eq(subjects.id, params.id),
    })

    if (!existingSubject) {
      return NextResponse.json({ message: "Subject not found" }, { status: 404 })
    }

    // Delete subject
    await db.delete(subjects).where(eq(subjects.id, params.id))

    return NextResponse.json({ message: "Subject deleted successfully" })
  } catch (error) {
    console.error("Error deleting subject:", error)
    return NextResponse.json({ message: "An error occurred while deleting the subject" }, { status: 500 })
  }
}
