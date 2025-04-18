import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { pendingRegistrations } from "@/lib/db/schema"
import { sendRejectionEmail } from "@/lib/email"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Get the pending registration
    const registration = await db.query.pendingRegistrations.findFirst({
      where: eq(pendingRegistrations.id, params.id),
    })

    if (!registration) {
      return NextResponse.json({ message: "Registration not found" }, { status: 404 })
    }

    // Get rejection reason if provided
    let reason = ""
    try {
      const body = await request.json()
      reason = body.reason || ""
    } catch (e) {
      // No body or invalid JSON, continue without reason
    }

    // Delete the pending registration
    await db.delete(pendingRegistrations).where(eq(pendingRegistrations.id, params.id))

    // Send rejection email
    await sendRejectionEmail(registration.email, registration.name, reason)

    return NextResponse.json({
      message: "Registration rejected successfully",
    })
  } catch (error) {
    console.error("Error rejecting registration:", error)
    return NextResponse.json({ message: "An error occurred while rejecting the registration" }, { status: 500 })
  }
}
