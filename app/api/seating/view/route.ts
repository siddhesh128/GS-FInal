import { type NextRequest, NextResponse } from "next/server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { and, eq, sql } from "drizzle-orm"
import { seatingArrangements } from "@/lib/db/schema"

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    // Get query parameters
    const url = new URL(request.url)
    const examId = url.searchParams.get("examId")
    const subjectId = url.searchParams.get("subjectId")
    const buildingId = url.searchParams.get("buildingId")
    const search = url.searchParams.get("search")
    const page = Number.parseInt(url.searchParams.get("page") || "1")
    const pageSize = Number.parseInt(url.searchParams.get("pageSize") || "50")

    // Calculate offset
    const offset = (page - 1) * pageSize

    // Build query conditions
    const conditions = []

    if (examId) {
      conditions.push(eq(seatingArrangements.examId, examId))
    }

    if (subjectId) {
      conditions.push(eq(seatingArrangements.subjectId, subjectId))
    }

    // We'll handle buildingId in the join condition

    // Get total count for pagination
    const totalCountQuery = await db
      .select({ count: sql`count(*)` })
      .from(seatingArrangements)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .execute()

    const totalCount = Number.parseInt(totalCountQuery[0]?.count?.toString() || "0")
    const totalPages = Math.ceil(totalCount / pageSize)

    // Get seating arrangements with all related data
    const query = db.query.seatingArrangements.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        exam: true,
        subject: true,
        student: true,
        room: {
          with: {
            building: true,
          },
        },
        invigilator: {
          columns: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
      offset,
      limit: pageSize,
      orderBy: (seatingArrangements, { desc }) => [desc(seatingArrangements.createdAt)],
    })

    let seatingData = await query
    
    // Get subject-specific schedules for the fetched exams
    const examIds = [...new Set(seatingData.map(sa => sa.examId))]
    const subjectIds = [...new Set(seatingData.filter(sa => sa.subjectId).map(sa => sa.subjectId as string))]
    
    // Fetch all relevant subject schedules
    const subjectSchedules = examIds.length > 0 ? await db.query.subjectSchedules.findMany({
      where: (ss, { and, inArray }) => 
        and(
          inArray(ss.examId, examIds),
          subjectIds.length > 0 ? inArray(ss.subjectId, subjectIds) : undefined
        )
    }) : []
    
    // Enhance seating data with subject schedule information
    seatingData = seatingData.map(arrangement => {
      // Find subject schedule if available
      const schedule = arrangement.subjectId ? 
        subjectSchedules.find(ss => 
          ss.examId === arrangement.examId && 
          ss.subjectId === arrangement.subjectId
        ) : null
      
      return {
        ...arrangement,
        subjectSchedule: schedule ? {
          date: schedule.date,
          startTime: schedule.startTime,
          endTime: schedule.endTime
        } : null
      }
    })

    // Filter by building ID if provided
    if (buildingId) {
      seatingData = seatingData.filter((arrangement) => arrangement.room.building.id === buildingId)
    }

    // Filter by search query if provided
    if (search) {
      const searchLower = search.toLowerCase()
      seatingData = seatingData.filter(
        (arrangement) =>
          arrangement.student.name.toLowerCase().includes(searchLower) ||
          arrangement.student.email.toLowerCase().includes(searchLower),
      )
    }

    return NextResponse.json({
      items: seatingData,
      totalRecords: totalCount,
      totalPages,
      currentPage: page,
    })
  } catch (error) {
    console.error("Error fetching seating arrangements:", error)
    return NextResponse.json({ message: "An error occurred while fetching the seating arrangement" }, { status: 500 })
  }
}
