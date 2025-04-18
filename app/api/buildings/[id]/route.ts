import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { buildings } from "@/lib/db/schema"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const building = await db.query.buildings.findFirst({
      where: eq(buildings.id, params.id),
    })

    if (!building) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 })
    }

    return NextResponse.json(building)
  } catch (error) {
    console.error("Error fetching building:", error)
    return NextResponse.json({ message: "Failed to fetch building" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { name, number, address } = await request.json()

    if (!name || !number) {
      return NextResponse.json({ message: "Name and number are required" }, { status: 400 })
    }

    const updatedBuilding = await db
      .update(buildings)
      .set({
        name,
        number,
        address,
      })
      .where(eq(buildings.id, params.id))
      .returning()

    if (!updatedBuilding.length) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 })
    }

    return NextResponse.json(updatedBuilding[0])
  } catch (error) {
    console.error("Error updating building:", error)
    return NextResponse.json({ message: "Failed to update building" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const deletedBuilding = await db.delete(buildings).where(eq(buildings.id, params.id)).returning()

    if (!deletedBuilding.length) {
      return NextResponse.json({ message: "Building not found" }, { status: 404 })
    }

    return NextResponse.json({ message: "Building deleted successfully" })
  } catch (error) {
    console.error("Error deleting building:", error)
    return NextResponse.json({ message: "Failed to delete building" }, { status: 500 })
  }
}
