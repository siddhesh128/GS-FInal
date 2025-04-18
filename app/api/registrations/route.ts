import { type NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const registrations = await db.query.pendingRegistrations.findMany({
      orderBy: (pendingRegistrations, { desc }) => [desc(pendingRegistrations.createdAt)],
    })

    return NextResponse.json(registrations)
  } catch (error) {
    console.error("Error fetching pending registrations:", error)
    return NextResponse.json({ message: "An error occurred while fetching pending registrations" }, { status: 500 })
  }
}
