import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { seatingArrangements, rooms } from "@/lib/db/schema"

const generateSeatingSchema = z.object({
  examId: z.string().uuid(),
  subjectId: z.string().uuid().optional(),
  roomPrefix: z.string().min(1),
  seatPrefix: z.string().min(1),
  studentsPerRoom: z.number().int().positive(),
  generationMode: z.enum(["auto", "manual"]).optional().default("auto"),
  roomIds: z.array(z.string()).optional(),
  buildingId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    console.log("Received seating generation request:", body); // Add this for debugging
    const validatedData = generateSeatingSchema.parse(body)

    // Get all enrollments for the exam
    const examEnrollments = await db.query.enrollments.findMany({
      where: (enrollments, { eq }) => eq(enrollments.examId, validatedData.examId),
    })

    if (examEnrollments.length === 0) {
      return NextResponse.json({ message: "No students enrolled in this exam" }, { status: 400 })
    }

    // Check if seating arrangements already exist for this exam
    const existingSeating = await db.query.seatingArrangements.findMany({
      where: (seatingArrangements, { eq }) => eq(seatingArrangements.examId, validatedData.examId),
    })

    if (existingSeating.length > 0) {
      // Delete existing seating arrangements
      await db.delete(seatingArrangements).where(eq(seatingArrangements.examId, validatedData.examId))
    }

    // Get available rooms based on selection criteria
    let availableRooms;
    
    if (validatedData.generationMode === "manual" && validatedData.roomIds && validatedData.roomIds.length > 0) {
      // For manual mode, use the selected rooms
      // Make sure roomIds is definitely an array
      const roomIds = validatedData.roomIds;
      availableRooms = await db.query.rooms.findMany({
        where: (rooms, { inArray }) => {
          // Use inArray with the non-null roomIds array
          return inArray(rooms.id, roomIds);
        },
        orderBy: (rooms, { asc }) => [asc(rooms.roomNumber)]
      });
    } else {
      // For auto mode
      if (validatedData.buildingId && validatedData.buildingId !== "all") {
        // Make sure buildingId is definitely a string
        const buildingId = validatedData.buildingId;
        availableRooms = await db.query.rooms.findMany({
          where: (rooms, { eq }) => {
            // Use eq with the non-null buildingId
            return eq(rooms.buildingId, buildingId);
          },
          orderBy: (rooms, { asc }) => [asc(rooms.roomNumber)]
        });
      } else {
        availableRooms = await db.query.rooms.findMany({
          orderBy: (rooms, { asc }) => [asc(rooms.roomNumber)]
        });
      }
    }

    if (availableRooms.length === 0) {
      return NextResponse.json({ message: "No rooms available for seating arrangements" }, { status: 400 })
    }

    console.log(`Found ${availableRooms.length} available rooms`);

    // Generate new seating arrangements
    const seatingData = []
    let roomCounter = 1
    let seatCounter = 1
    
    // Keep track of room assignments for room prefixes
    const roomAssignments = new Map();

    for (const enrollment of examEnrollments) {
      const roomNumberString = `${validatedData.roomPrefix}${roomCounter}`;
      
      // Find or create a room assignment
      let roomId;
      if (roomAssignments.has(roomNumberString)) {
        roomId = roomAssignments.get(roomNumberString);
      } else {
        // Find an actual room to use from the database
        // Use modulo to cycle through available rooms if we have more rooms than available
        const roomIndex = (roomCounter - 1) % availableRooms.length;
        roomId = availableRooms[roomIndex].id;
        roomAssignments.set(roomNumberString, roomId);
      }
      
      seatingData.push({
        examId: enrollment.examId,
        studentId: enrollment.studentId,
        roomId: roomId,
        seatNumber: `${validatedData.seatPrefix}${seatCounter}`,
        subjectId: validatedData.subjectId || null,
      })

      seatCounter++
      if (seatCounter > validatedData.studentsPerRoom) {
        seatCounter = 1
        roomCounter++
      }
    }

    console.log(`Generated ${seatingData.length} seating assignments`);

    // Insert new seating arrangements
    const createdSeating = await db.insert(seatingArrangements).values(seatingData).returning()

    return NextResponse.json({
      message: "Seating arrangements generated successfully",
      count: createdSeating.length,
    })
  } catch (error) {
    console.error("Error generating seating arrangements:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: "Invalid input data", errors: error.errors }, { status: 400 })
    }

    return NextResponse.json({ message: "An error occurred while generating seating arrangements" }, { status: 500 })
  }
}
