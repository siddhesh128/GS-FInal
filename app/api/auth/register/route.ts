import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { db } from "@/lib/db"
import { pendingRegistrations } from "@/lib/db/schema"
import { hashPassword } from "@/lib/auth"

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  verified: z.boolean().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Check if user with email already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, validatedData.email),
    })

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
    }

    // Check if there's already a pending registration with this email
    const existingPendingRegistration = await db.query.pendingRegistrations.findFirst({
      where: (pendingRegistrations, { eq }) => eq(pendingRegistrations.email, validatedData.email),
    })

    if (existingPendingRegistration) {
      return NextResponse.json({ message: "Registration with this email is already pending approval" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create pending registration
    const newPendingRegistration = await db
      .insert(pendingRegistrations)
      .values({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword, // Store the hashed password
      })
      .returning()

    return NextResponse.json({ message: "Registration submitted successfully and pending approval" }, { status: 201 })
  } catch (error) {
    console.error("Registration error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred during registration" }, { status: 500 })
  }
}
