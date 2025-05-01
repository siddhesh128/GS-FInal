import { type NextRequest, NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { z } from "zod"

import { db } from "@/lib/db"
import { pendingRegistrations } from "@/lib/db/schema"

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters long" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters long" }),
  department: z.string().optional(),
  year: z.enum(["FE", "SE", "TE", "BE"]).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Check if user already exists as pending registration
    const existingPending = await db.query.pendingRegistrations.findFirst({
      where: (pendingRegistrations, { eq }) => eq(pendingRegistrations.email, validatedData.email),
    })

    if (existingPending) {
      return NextResponse.json({ message: "A registration with this email is already pending" }, { status: 409 })
    }

    // Check if user already exists in users table
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, validatedData.email),
    })

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hash(validatedData.password, 10)

    // Create pending registration
    const newPendingRegistration = await db
      .insert(pendingRegistrations)
      .values({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        department: validatedData.department || null,
        year: validatedData.year || null,
      })
      .returning({
        id: pendingRegistrations.id,
        name: pendingRegistrations.name,
        email: pendingRegistrations.email,
        createdAt: pendingRegistrations.createdAt,
      })

    return NextResponse.json(
      {
        success: true,
        user: newPendingRegistration[0],
        message: "Registration submitted successfully. Approval is pending.",
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "Registration failed" }, { status: 500 })
  }
}
