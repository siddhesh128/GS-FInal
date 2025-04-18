import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { hashPassword } from "@/lib/auth"

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "FACULTY", "STUDENT"]),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const role = url.searchParams.get("role")

    const query = db.query.users
    let whereClause = undefined

    // Filter by role if provided
    if (role) {
      whereClause = eq(users.role, role as "ADMIN" | "FACULTY" | "STUDENT")
    }

    const allUsers = await query.findMany({
      where: whereClause,
      orderBy: (users, { asc }) => [asc(users.name)],
    })

    // Remove password field from response
    const sanitizedUsers = allUsers.map(({ password, ...user }) => user)

    return NextResponse.json(sanitizedUsers)
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ message: "An error occurred while fetching users" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    const validatedData = userSchema.parse(body)

    // Check if user with email already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, validatedData.email),
    })

    if (existingUser) {
      return NextResponse.json({ message: "User with this email already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password)

    // Create new user
    const newUser = await db
      .insert(users)
      .values({
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })

    return NextResponse.json(newUser[0], { status: 201 })
  } catch (error) {
    console.error("Error creating user:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while creating the user" }, { status: 500 })
  }
}
