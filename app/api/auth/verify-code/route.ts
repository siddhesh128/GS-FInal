import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { registrationVerifications } from "@/lib/db/schema"
import { sendVerificationEmail } from "@/lib/email"

const requestSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = requestSchema.parse(body)

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

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Store the verification code with an expiration time (30 minutes)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now

    // Delete any existing verification codes for this email
    await db.delete(registrationVerifications).where(eq(registrationVerifications.email, validatedData.email))

    // Insert the verification code
    await db.insert(registrationVerifications).values({
      email: validatedData.email,
      code: verificationCode,
      expiresAt,
    })

    // Send verification email
    await sendVerificationEmail(validatedData.email, validatedData.name, verificationCode)

    return NextResponse.json({
      message: "Verification code sent",
    })
  } catch (error) {
    console.error("Verification request error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred during verification request" }, { status: 500 })
  }
}
