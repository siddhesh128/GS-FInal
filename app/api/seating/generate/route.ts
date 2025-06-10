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

// Helper function to create a deterministic but unpredictable shuffle based on exam and subject
function createSubjectShuffle(examId: string, subjectId: string, enrollments: any[]) {
  if (enrollments.length === 0) {
    return enrollments;
  }
  
  // Create a seed based on exam and subject IDs
  const seed = examId + subjectId;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Make sure hash is positive
  hash = Math.abs(hash);
  
  // Use the hash to create a pseudo-random but deterministic shuffle
  const shuffled = [...enrollments]; // Create a copy
  
  // Fisher-Yates shuffle with deterministic pseudo-random numbers
  for (let i = shuffled.length - 1; i > 0; i--) {
    // Use hash-based pseudo-random number generation
    hash = Math.abs((hash * 9301 + 49297) % 233280);
    const j = hash % (i + 1); // Simpler modulo operation to ensure valid index
    
    // Swap elements
    if (j < shuffled.length && i < shuffled.length) {
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
  }
  
  // Verify all elements are still valid
  const hasUndefined = shuffled.some(item => item === undefined || item === null);
  if (hasUndefined || shuffled.length !== enrollments.length) {
    console.error(`Shuffle error: Original ${enrollments.length} items, shuffled ${shuffled.length} items, has undefined: ${hasUndefined}`);
    console.error('Original enrollments:', enrollments);
    console.error('Shuffled enrollments:', shuffled);
    return enrollments; // Return original array if shuffle failed
  }
  
  return shuffled;
}

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

    console.log(`Found ${examEnrollments.length} total enrollments:`, examEnrollments.map(e => ({ examId: e.examId, studentId: e.studentId })))

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
      console.log(`Found ${subjects.length} subjects for exam:`, subjects);
    } else if (validatedData.subjectId) {
      subjects = [validatedData.subjectId];
      console.log(`Single subject mode:`, subjects);
    }

    console.log(`Generating seating for ${subjects.length} subjects with anti-malpractice measures`);

    /* 
     * ANTI-MALPRACTICE SEATING ARRANGEMENT STRATEGY
     * 
     * The following logic implements multiple strategies to prevent students from 
     * getting predictable seating arrangements across different subjects:
     * 
     * 1. DIFFERENT STUDENT ORDER: Each subject uses a deterministic but different 
     *    shuffle of students based on exam and subject IDs
     * 
     * 2. DIFFERENT ROOM ALLOCATION: Each subject uses a different room allocation 
     *    strategy (sequential, reverse, interleaved, offset)
     * 
     * 3. DIFFERENT SEAT PATTERNS: Each subject uses different seat numbering 
     *    patterns (sequential, odd-even split, reverse, interleaved)
     * 
     * 4. DETERMINISTIC RANDOMNESS: Uses deterministic pseudo-random algorithms 
     *    to ensure consistent results across multiple generations while maintaining 
     *    unpredictability for students
     * 
     * This ensures that students cannot predict their seating for one subject 
     * based on their seating in another subject, preventing collaboration and 
     * malpractice opportunities.
     */

    // Generate new seating arrangements with anti-malpractice logic
    const seatingData = [];
    
    // Keep track of assigned invigilators for each room to assign new ones if needed
    const roomsWithNeedForRandomInvigilator = new Set<string>();
    
    // IMPORTANT: Create seating for EVERY enrolled student for EVERY exam subject
    // This ensures complete coverage regardless of subject schedules
    console.log(`Creating seating arrangements for ${examEnrollments.length} students across ${subjects.length} subjects`);
    console.log(`Total expected seating arrangements: ${examEnrollments.length * subjects.length}`);
    
    // For each subject, create completely different seating arrangements for ALL enrolled students
    for (let subjectIndex = 0; subjectIndex < subjects.length; subjectIndex++) {
      const subjectId = subjects[subjectIndex];
      
      // Create a deterministic but different shuffle for each subject using ALL enrollments
      const subjectShuffledEnrollments = createSubjectShuffle(
        validatedData.examId, 
        subjectId, 
        examEnrollments
      );
      
      console.log(`Subject ${subjectIndex + 1}: Processing ${subjectShuffledEnrollments.length} enrollments for subject ${subjectId}`);
      
      // Validate that we have valid enrollments
      if (subjectShuffledEnrollments.length === 0) {
        console.warn(`No enrollments found for subject ${subjectId}`);
        continue;
      }
      
      // Verify we're processing ALL exam enrollments for this subject
      if (subjectShuffledEnrollments.length !== examEnrollments.length) {
        console.error(`MISMATCH: Expected ${examEnrollments.length} enrollments but got ${subjectShuffledEnrollments.length} for subject ${subjectId}`);
      }
      
      // Use different room allocation strategy for each subject
      const roomAllocationStrategies = [
        // Strategy 1: Sequential allocation
        (index: number) => index % availableRooms.length,
        // Strategy 2: Reverse sequential allocation
        (index: number) => (availableRooms.length - 1 - (index % availableRooms.length)),
        // Strategy 3: Interleaved allocation
        (index: number) => (index * 2) % availableRooms.length,
        // Strategy 4: Offset allocation
        (index: number) => (index + Math.floor(availableRooms.length / 2)) % availableRooms.length,
      ];
      
      const strategy = roomAllocationStrategies[subjectIndex % roomAllocationStrategies.length];
      
      let seatCounter = 1;
      let roomChangeCounter = 0;
      
      console.log(`Subject ${subjectIndex + 1}: Processing ${subjectShuffledEnrollments.length} enrollments`);
      
      // Validate that we have valid enrollments
      if (subjectShuffledEnrollments.length === 0) {
        console.warn(`No enrollments found for subject ${subjectId}`);
        continue;
      }
      
      // Process enrollments for this subject
      for (let enrollmentIndex = 0; enrollmentIndex < subjectShuffledEnrollments.length; enrollmentIndex++) {
        const enrollment = subjectShuffledEnrollments[enrollmentIndex];
        
        // Add safety check for undefined enrollment
        if (!enrollment || !enrollment.examId || !enrollment.studentId) {
          console.warn(`Invalid enrollment at index ${enrollmentIndex}:`, enrollment);
          continue;
        }
        
        // Safety check to ensure enrollment exists
        if (!enrollment) {
          console.error(`Enrollment at index ${enrollmentIndex} is undefined for subject ${subjectId}`);
          continue;
        }
        
        // Additional safety check for required properties
        if (!enrollment.examId || !enrollment.studentId) {
          console.error(`Invalid enrollment data:`, enrollment);
          continue;
        }
        
        // Determine room based on strategy
        const roomSlot = Math.floor(enrollmentIndex / validatedData.studentsPerRoom);
        const actualRoomIndex = strategy(roomSlot);
        const roomId = availableRooms[actualRoomIndex].id;
        
        // If this is a new room and doesn't have a manually assigned invigilator
        if (!roomInvigilatorMap.has(roomId)) {
          roomsWithNeedForRandomInvigilator.add(roomId);
        }
        
        // Get the invigilator assigned to this room (if any)
        const invigilatorId = roomInvigilatorMap.get(roomId) || null;
        
        // Generate seat number with subject-specific pattern to avoid predictability
        const basePosition = enrollmentIndex % validatedData.studentsPerRoom;
        const seatPattern = [
          // Pattern 1: Sequential
          (pos: number) => pos + 1,
          // Pattern 2: Odd-Even split
          (pos: number) => pos % 2 === 0 ? (pos / 2) + 1 : Math.ceil(validatedData.studentsPerRoom / 2) + Math.floor(pos / 2) + 1,
          // Pattern 3: Reverse
          (pos: number) => validatedData.studentsPerRoom - pos,
          // Pattern 4: Interleaved
          (pos: number) => ((pos * 3) % validatedData.studentsPerRoom) + 1,
        ];
        
        const patternFunction = seatPattern[subjectIndex % seatPattern.length];
        const calculatedSeatNumber = patternFunction(basePosition);
        
        seatingData.push({
          examId: enrollment.examId,
          studentId: enrollment.studentId,
          roomId: roomId,
          seatNumber: `${validatedData.seatPrefix}${calculatedSeatNumber}`,
          subjectId: subjectId,
          invigilatorId: invigilatorId,
        });
      }
      
      console.log(`Subject ${subjectIndex + 1}/${subjects.length}: Generated ${subjectShuffledEnrollments.length} seat assignments using strategy ${subjectIndex % roomAllocationStrategies.length + 1} and pattern ${subjectIndex % 4 + 1}`);
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
    console.log(`Expected: ${examEnrollments.length * subjects.length} seating assignments`);
    console.log(`Match: ${seatingData.length === examEnrollments.length * subjects.length ? 'YES' : 'NO'}`);
    
    // Log breakdown by student and subject for debugging
    const studentSubjectCount = new Map<string, Set<string>>();
    seatingData.forEach(seat => {
      if (!studentSubjectCount.has(seat.studentId)) {
        studentSubjectCount.set(seat.studentId, new Set());
      }
      studentSubjectCount.get(seat.studentId)!.add(seat.subjectId);
    });
    
    console.log('Seating breakdown by student:');
    for (const [studentId, subjectSet] of studentSubjectCount.entries()) {
      console.log(`Student ${studentId}: ${subjectSet.size} subjects - [${Array.from(subjectSet).join(', ')}]`);
    }
    
    // Verify each student has all subjects
    let allStudentsHaveAllSubjects = true;
    for (const [studentId, subjectSet] of studentSubjectCount.entries()) {
      if (subjectSet.size !== subjects.length) {
        console.error(`MISSING SUBJECTS for Student ${studentId}: Expected ${subjects.length}, got ${subjectSet.size}`);
        allStudentsHaveAllSubjects = false;
      }
    }
    
    console.log(`All students have all subjects: ${allStudentsHaveAllSubjects ? 'YES' : 'NO'}`);
    
    if (!allStudentsHaveAllSubjects) {
      console.error('ERROR: Some students are missing seating arrangements for some subjects!');
    }

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
