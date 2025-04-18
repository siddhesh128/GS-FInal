import { type NextRequest, NextResponse } from "next/server"

import { destroySession } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const logoutCookie = await destroySession()

    return NextResponse.json(
      { message: "Logout successful" },
      {
        status: 200,
        headers: {
          "Set-Cookie": logoutCookie,
        },
      },
    )
  } catch (error) {
    console.error("Logout error:", error)

    return NextResponse.json({ message: "An error occurred during logout" }, { status: 500 })
  }
}
