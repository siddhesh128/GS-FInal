import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { rooms } from "@/lib/db/schema"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, params.id),
      with: {
        building: true,
      },
    })

    if (!room) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    return NextResponse.json(room)
  } catch (error) {
    console.error("Error fetching room:", error)
    return NextResponse.json({ message: "Failed to fetch room" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { roomNumber, buildingId, floor, capacity } = await request.json()

    if (!roomNumber || !buildingId || !floor || !capacity) {
      return NextResponse.json({ message: "All fields are required" }, { status: 400 })
    }

    const updatedRoom = await db
      .update(rooms)
      .set({
        roomNumber,
        buildingId,
        floor,
        capacity: Number.parseInt(capacity, 10),
      })
      .where(eq(rooms.id, params.id))
      .returning()

    if (!updatedRoom.length) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    const roomWithBuilding = await db.query.rooms.findFirst({
      where: (rooms, { eq }) => eq(rooms.id, updatedRoom[0].id),
      with: {
        building: true,
      },
    })

    return NextResponse.json(roomWithBuilding)
  } catch (error) {
    console.error("Error updating room:", error)
    return NextResponse.json({ message: "Failed to update room" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const deletedRoom = await db.delete(rooms).where(eq(rooms.id, params.id)).returning()

    if (!deletedRoom.length) {
      return NextResponse.json({ message: "Room not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Room deleted successfully" })
  } catch (error) {
    console.error("Error deleting room:", error)
    return NextResponse.json({ message: "Failed to delete room" }, { status: 500 })
  }
}
