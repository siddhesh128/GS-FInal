import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { pendingRegistrations, users, notifications } from "@/lib/db/schema"
import { sendApprovalEmail } from "@/lib/email"

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

    // Check if user with email already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, registration.email),
    })

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
    }

    // Create new user - password is already hashed in the pending registration
    const newUser = await db
      .insert(users)
      .values({
        name: registration.name,
        email: registration.email,
        password: registration.password, // Password is already hashed
        role: "STUDENT",
        department: registration.department,
        year: registration.year,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        department: users.department,
        year: users.year,
      })

    // Delete the pending registration
    await db.delete(pendingRegistrations).where(eq(pendingRegistrations.id, params.id))

    // Create a notification for the new user
    await db.insert(notifications).values({
      userId: newUser[0].id,
      title: "Registration Approved",
      message: "Your registration has been approved. Welcome to the Examination Management System!",
      isRead: "false",
    })

    // Send approval email
    await sendApprovalEmail(registration.email, registration.name)

    return NextResponse.json({
      message: "Registration approved successfully",
      user: newUser[0],
    })
  } catch (error) {
    console.error("Error approving registration:", error)
    return NextResponse.json({ message: "An error occurred while approving the registration" }, { status: 500 })
  }
}
