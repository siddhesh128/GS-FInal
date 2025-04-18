import { type NextRequest, NextResponse } from "next/server"

import { seedDatabase } from "@/lib/db/seed"

export async function POST(request: NextRequest) {
  try {
    const result = await seedDatabase()

    return NextResponse.json({
      message: "Database seeded successfully",
      data: result,
    })
  } catch (error) {
    console.error("Error seeding database:", error)

    return NextResponse.json({ message: "An error occurred while seeding the database" }, { status: 500 })
  }
}
