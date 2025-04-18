import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { db } from "@/lib/db"
import { users, verificationCodes } from "@/lib/db/schema"
import { comparePasswords, createSession } from "@/lib/auth"
import { sendLoginVerificationCode } from "@/lib/email"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Check if this is a verification code submission
    if (body.code) {
      return await verifyCode(body)
    }

    // Otherwise, process as a regular login
    const validatedData = loginSchema.parse(body)

    const user = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    })

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    const passwordMatch = await comparePasswords(validatedData.password, user.password)

    if (!passwordMatch) {
      return NextResponse.json({ message: "Invalid email or password" }, { status: 401 })
    }

    // Generate a 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Store the verification code with an expiration time (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    // Delete any existing verification codes for this user
    await db.delete(verificationCodes).where(eq(verificationCodes.userId, user.id))

    // Insert the new verification code
    await db.insert(verificationCodes).values({
      userId: user.id,
      code: verificationCode,
      expiresAt,
    })

    // Send the verification code via email
    await sendLoginVerificationCode(user.email, user.name, verificationCode)

    return NextResponse.json({
      message: "Verification code sent",
      requiresVerification: true,
      email: user.email,
    })
  } catch (error) {
    console.error("Login error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred during login" }, { status: 500 })
  }
}

// Helper function to verify the code
async function verifyCode(body: any) {
  try {
    const validatedData = verifyCodeSchema.parse(body)

    // Find the user
    const user = await db.query.users.findFirst({
      where: eq(users.email, validatedData.email),
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Find the verification code
    const storedCode = await db.query.verificationCodes.findFirst({
      where: eq(verificationCodes.userId, user.id),
    })

    if (!storedCode) {
      return NextResponse.json({ message: "Verification code not found" }, { status: 404 })
    }

    // Check if the code has expired
    if (new Date() > new Date(storedCode.expiresAt)) {
      return NextResponse.json({ message: "Verification code has expired" }, { status: 401 })
    }

    // Check if the code matches
    if (storedCode.code !== validatedData.code) {
      return NextResponse.json({ message: "Invalid verification code" }, { status: 401 })
    }

    // Delete the verification code
    await db.delete(verificationCodes).where(eq(verificationCodes.id, storedCode.id))

    // Create a session
    const session = await createSession(user)

    return NextResponse.json(
      { message: "Login successful" },
      {
        status: 200,
        headers: {
          "Set-Cookie": session.cookie,
        },
      },
    )
  } catch (error) {
    console.error("Verification error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred during verification" }, { status: 500 })
  }
}
