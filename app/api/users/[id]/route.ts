import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { hashPassword } from "@/lib/auth"

const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "FACULTY", "STUDENT"]).optional(),
})

// GET a single user by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, params.id),
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user

    return NextResponse.json(userWithoutPassword)
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ message: "An error occurred while fetching the user" }, { status: 500 })
  }
}

// UPDATE a user
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = userUpdateSchema.parse(body)

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, params.id),
    })

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}

    if (validatedData.name) updateData.name = validatedData.name
    if (validatedData.email) updateData.email = validatedData.email
    if (validatedData.role) updateData.role = validatedData.role
    if (validatedData.password) {
      updateData.password = await hashPassword(validatedData.password)
    }

    updateData.updatedAt = new Date()

    // Update user
    const updatedUser = await db.update(users).set(updateData).where(eq(users.id, params.id)).returning({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })

    return NextResponse.json(updatedUser[0])
  } catch (error) {
    console.error("Error updating user:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while updating the user" }, { status: 500 })
  }
}

// DELETE a user
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, params.id),
    })

    if (!existingUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Delete user
    await db.delete(users).where(eq(users.id, params.id))

    return NextResponse.json({ message: "User deleted successfully" }, { status: 200 })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ message: "An error occurred while deleting the user" }, { status: 500 })
  }
}
