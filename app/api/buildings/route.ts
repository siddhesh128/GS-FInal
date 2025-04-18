import { type NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildings } from "@/lib/db/schema"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const allBuildings = await db.query.buildings.findMany({
      orderBy: (buildings, { asc }) => [asc(buildings.name)],
    })

    return NextResponse.json(allBuildings)
  } catch (error) {
    console.error("Error fetching buildings:", error)
    return NextResponse.json({ message: "Failed to fetch buildings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { name, number, address } = await request.json()

    if (!name || !number) {
      return NextResponse.json({ message: "Name and number are required" }, { status: 400 })
    }

    const newBuilding = await db
      .insert(buildings)
      .values({
        name,
        number,
        address,
      })
      .returning()

    return NextResponse.json(newBuilding[0])
  } catch (error) {
    console.error("Error creating building:", error)
    return NextResponse.json({ message: "Failed to create building" }, { status: 500 })
  }
}
