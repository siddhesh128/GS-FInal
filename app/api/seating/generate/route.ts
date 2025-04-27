import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { eq } from "drizzle-orm"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { seatingArrangements, rooms } from "@/lib/db/schema"

const roomInvigilatorSchema = z.object({
  roomId: z.string().uuid(),
  invigilatorId: z.string().uuid()
});

const generateSeatingSchema = z.object({
  examId: z.string().uuid(),
  subjectId: z.string().uuid().optional().nullable(),
  generateForAllSubjects: z.boolean().optional().default(false),
  roomPrefix: z.string().min(1),
  seatPrefix: z.string().min(1),
  studentsPerRoom: z.number().int().positive(),
  generationMode: z.enum(["auto", "manual"]).optional().default("auto"),
  roomIds: z.array(z.string()).optional(),
  buildingId: z.string().optional(),
  roomInvigilators: z.array(roomInvigilatorSchema).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 })
    }

    const body = await request.json()
    console.log("Received seating generation request:", body);
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

    // Create invigilator mapping
    const roomInvigilatorMap = new Map<string, string>();
    
    // If roomInvigilators is provided, populate the map
    if (validatedData.roomInvigilators && validatedData.roomInvigilators.length > 0) {
      validatedData.roomInvigilators.forEach(ri => {
        roomInvigilatorMap.set(ri.roomId, ri.invigilatorId);
      });
    }

    // Get all faculty members for random assignment
    const facultyMembers = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, "FACULTY"),
      columns: {
        id: true
      }
    });

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

    // Get all subjects for this exam if generating for all subjects
    let subjects: string[] = [];
    if (validatedData.generateForAllSubjects) {
      const examSubjects = await db.query.examSubjects.findMany({
        where: (es, { eq }) => eq(es.examId, validatedData.examId),
        columns: {
          subjectId: true
        }
      });
      subjects = examSubjects.map(es => es.subjectId);
    } else if (validatedData.subjectId) {
      subjects = [validatedData.subjectId];
    }

    // Generate new seating arrangements
    const seatingData = [];
    let roomCounter = 1;
    let seatCounter = 1;
    
    // Keep track of room assignments for room prefixes
    const roomAssignments = new Map();
    
    // Keep track of assigned invigilators for each room to assign new ones if needed
    const roomsWithNeedForRandomInvigilator = new Set<string>();

    // Process enrollments
    for (const enrollment of examEnrollments) {
      // For each subject that needs arrangements
      for (const subjectId of subjects) {
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
          
          // If this is a new room and doesn't have a manually assigned invigilator
          if (!roomInvigilatorMap.has(roomId)) {
            roomsWithNeedForRandomInvigilator.add(roomId);
          }
        }
        
        // Get the invigilator assigned to this room (if any)
        const invigilatorId = roomInvigilatorMap.get(roomId) || null;
        
        seatingData.push({
          examId: enrollment.examId,
          studentId: enrollment.studentId,
          roomId: roomId,
          seatNumber: `${validatedData.seatPrefix}${seatCounter}`,
          subjectId: subjectId,
          invigilatorId: invigilatorId,
        });
      }

      seatCounter++;
      if (seatCounter > validatedData.studentsPerRoom) {
        seatCounter = 1;
        roomCounter++;
      }
    }

    // Randomly assign invigilators to rooms that don't have one
    if (facultyMembers.length > 0 && roomsWithNeedForRandomInvigilator.size > 0) {
      // Create an array from the Set of room IDs that need invigilators
      const roomIds = Array.from(roomsWithNeedForRandomInvigilator);
      
      for (const roomId of roomIds) {
        // Pick a random faculty member
        const randomIndex = Math.floor(Math.random() * facultyMembers.length);
        const invigilator = facultyMembers[randomIndex];
        
        // Assign this invigilator to the room
        roomInvigilatorMap.set(roomId, invigilator.id);
        
        // Update all seating assignments for this room
        for (const seat of seatingData) {
          if (seat.roomId === roomId) {
            seat.invigilatorId = invigilator.id;
          }
        }
        
        // Remove this faculty member from the pool to ensure different invigilators for each room
        if (facultyMembers.length > roomsWithNeedForRandomInvigilator.size) {
          facultyMembers.splice(randomIndex, 1);
        }
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
