import { type NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { notifications } from "@/lib/db/schema"

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Mark all notifications as read
    await db.update(notifications).set({ isRead: "true" }).where(eq(notifications.userId, session.user.id))

    return NextResponse.json({ message: "All notifications marked as read" })
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return NextResponse.json({ message: "An error occurred while marking all notifications as read" }, { status: 500 })
  }
}
