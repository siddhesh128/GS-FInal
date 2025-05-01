import { redirect } from "next/navigation"

import { SeatingView } from "@/components/seating-view"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"

export default async function SeatingViewPage() {
  const session = await getSession()

  if (!session) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  // Get all exams for filtering
  const rawExams = await db.query.exams.findMany({
    orderBy: (exams, { desc }) => [desc(exams.date)],
  })

  // Transform exams data to match the expected types
  const exams = rawExams.map(exam => ({
    ...exam,
    date: exam.date.toISOString(),
    location: exam.location || "", // Ensure location is never null
    createdAt: exam.createdAt.toISOString(),
    updatedAt: exam.updatedAt.toISOString(),
  }))

  // Get all subjects for filtering
  const subjects = await db.query.subjects.findMany({
    orderBy: (subjects, { asc }) => [asc(subjects.name)],
  })

  // Get all buildings for filtering
  const buildings = await db.query.buildings.findMany({
    orderBy: (buildings, { asc }) => [asc(buildings.name)],
  })

  // Get a limited set of seating arrangements for initial view
  const rawSeatingArrangements = await db.query.seatingArrangements.findMany({
    with: {
      exam: true,
      subject: true,
      student: true,
      invigilator: {
        columns: {
          id: true,
          name: true,
          email: true,
        }
      },
      room: {
        with: {
          building: true,
        },
      },
    },
    orderBy: (seatingArrangements, { desc }) => [desc(seatingArrangements.createdAt)],
    limit: 100, // Limit initial load
  })

  // Get subject schedules for the initial load
  const examIds = [...new Set(rawSeatingArrangements.map(arr => arr.examId))];
  const subjectIds = [...new Set(
    rawSeatingArrangements
      .filter(arr => arr.subjectId)
      .map(arr => arr.subjectId as string)
  )];
  
  const subjectSchedules = subjectIds.length > 0 ? await db.query.subjectSchedules.findMany({
    where: (ss, { and, inArray }) => {
      const conditions = [];
      if (examIds.length) conditions.push(inArray(ss.examId, examIds));
      if (subjectIds.length) conditions.push(inArray(ss.subjectId, subjectIds));
      return and(...conditions);
    }
  }) : [];

  // Transform seating arrangements to match the expected types with subject schedules
  const seatingArrangements = rawSeatingArrangements.map(arr => {
    // Find matching subject schedule if available
    const schedule = arr.subjectId ? 
      subjectSchedules.find(ss => 
        ss.examId === arr.examId && 
        ss.subjectId === arr.subjectId
      ) : null;
      
    return {
      ...arr,
      subjectId: arr.subjectId || "", // Ensure subjectId is never null
      invigilatorId: arr.invigilatorId || "", // Ensure invigilatorId is never null
      subject: arr.subject || {
        id: "",
        name: "",
        code: "",
        description: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      exam: {
        ...arr.exam,
        date: arr.exam.date.toISOString(),
        location: arr.exam.location || "",
        createdAt: arr.exam.createdAt.toISOString(),
        updatedAt: arr.exam.updatedAt.toISOString(),
      },
      // Add subject schedule if available
      subjectSchedule: schedule ? {
        date: schedule.date.toISOString(),
        startTime: schedule.startTime,
        endTime: schedule.endTime
      } : null,
      createdAt: arr.createdAt.toISOString(),
      updatedAt: arr.updatedAt.toISOString(),
    }
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Seating Arrangements View</h2>
        <p className="text-muted-foreground">View and filter all seating arrangements</p>
      </div>
      <SeatingView
        initialSeatingArrangements={seatingArrangements}
        exams={exams}
        subjects={subjects}
        buildings={buildings}
      />
    </div>
  )
}
