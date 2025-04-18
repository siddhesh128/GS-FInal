import { type NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { rooms } from "@/lib/db/schema"

export async function GET() {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const allRooms = await db.query.rooms.findMany({
      with: {
        building: true,
      },
      orderBy: (rooms, { asc }) => [asc(rooms.roomNumber)],
    })

    return NextResponse.json(allRooms)
  } catch (error) {
    console.error("Error fetching rooms:", error)
    return NextResponse.json({ message: "Failed to fetch rooms" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { roomNumber, buildingId, floor, capacity } = await request.json()

    if (!roomNumber || !buildingId || !floor || !capacity) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    const newRoom = await db
      .insert(rooms)
      .values({
        roomNumber,
        buildingId,
        floor,
        capacity: Number.parseInt(capacity, 10),
      })
      .returning()

    const roomWithBuilding = await db.query.rooms.findFirst({
      where: (rooms, { eq }) => eq(rooms.id, newRoom[0].id),
      with: {
        building: true,
      },
    })

    return NextResponse.json(roomWithBuilding)
  } catch (error) {
    console.error("Error creating room:", error)
    return NextResponse.json({ message: "Failed to create room" }, { status: 500 })
  }
}
