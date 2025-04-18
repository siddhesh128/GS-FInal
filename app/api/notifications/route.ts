import { type NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const userNotifications = await db.query.notifications.findMany({
      where: (notifications, { eq }) => eq(notifications.userId, session.user.id),
      orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
      limit: 10,
    })

    return NextResponse.json(userNotifications)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ message: "An error occurred while fetching notifications" }, { status: 500 })
  }
}
