import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { notifications } from "@/lib/db/schema"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Get the notification
    const notification = await db.query.notifications.findFirst({
      where: (notifications, { and, eq }) =>
        and(eq(notifications.id, params.id), eq(notifications.userId, session.user.id)),
    })

    if (!notification) {
      return NextResponse.json({ message: "Notification not found" }, { status: 404 })
    }

    // Mark as read
    await db.update(notifications).set({ isRead: "true" }).where(eq(notifications.id, params.id))

    return NextResponse.json({ message: "Notification marked as read" })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return NextResponse.json({ message: "An error occurred while marking notification as read" }, { status: 500 })
  }
}
