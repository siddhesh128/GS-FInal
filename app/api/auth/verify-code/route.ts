import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { eq, and, lt } from "drizzle-orm"

import { db } from "@/lib/db"
import { registrationVerifications } from "@/lib/db/schema"

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1).max(6),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = verifyCodeSchema.parse(body)

    // Find the verification record
    const verification = await db.query.registrationVerifications.findFirst({
      where: (rv, { eq, and, gt }) => 
        and(
          eq(rv.email, validatedData.email),
          eq(rv.code, validatedData.code),
          gt(rv.expiresAt, new Date()) // Make sure the code hasn't expired
        )
    })

    if (!verification) {
      return NextResponse.json({ 
        message: "Invalid or expired verification code" 
      }, { status: 400 })
    }

    // Delete the used verification code
    await db.delete(registrationVerifications)
      .where(eq(registrationVerifications.id, verification.id))

    return NextResponse.json({
      message: "Code verified successfully",
      verified: true
    })
  } catch (error) {
    console.error("Verification error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred during verification" }, { status: 500 })
  }
}
