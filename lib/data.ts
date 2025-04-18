import { db } from "./db"

// Get exams based on user role and ID
export async function getExams(userId: string, role: string) {
  try {
    if (role === "ADMIN") {
      // Admins can see all exams
      return await db.query.exams.findMany({
        orderBy: (exams, { desc }) => [desc(exams.date)],
        with: {
          creator: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    } else if (role === "FACULTY") {
      // Faculty can see exams they're assigned to invigilate
      return await db.query.exams.findMany({
        where: (exams, { eq }) => eq(exams.createdBy, userId),
        orderBy: (exams, { desc }) => [desc(exams.date)],
      })
    } else {
      // Students can see exams they're enrolled in
      const enrollments = await db.query.enrollments.findMany({
        where: (enrollments, { eq }) => eq(enrollments.studentId, userId),
        with: {
          exam: true,
        },
      })

      return enrollments.map((enrollment) => enrollment.exam)
    }
  } catch (error) {
    console.error("Error fetching exams:", error)
    return []
  }
}

// Get seating arrangements based on user role and ID
export async function getSeatingArrangements(userId: string, role: string) {
  try {
    if (role === "ADMIN") {
      // Admins can see all seating arrangements
      return await db.query.seatingArrangements.findMany({
        with: {
          exam: true,
          student: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })
    } else if (role === "STUDENT") {
      // Students can only see their own seating arrangements
      return await db.query.seatingArrangements.findMany({
        where: (seatingArrangements, { eq }) => eq(seatingArrangements.studentId, userId),
        with: {
          exam: true,
        },
      })
    }

    return []
  } catch (error) {
    console.error("Error fetching seating arrangements:", error)
    return []
  }
}

// Get hall tickets for a student
export async function getHallTickets(studentId: string) {
  try {
    // First get enrollments
    const enrollments = await db.query.enrollments.findMany({
      where: (enrollments, { eq }) => eq(enrollments.studentId, studentId),
      with: {
        exam: true,
      },
    })

    // Then get seating arrangements separately
    const result = await Promise.all(
      enrollments.map(async (enrollment) => {
        // Get seating arrangement for this exam and student
        const seatingArrangement = await db.query.seatingArrangements.findFirst({
          where: (sa, { and, eq }) =>
            and(eq(sa.examId, enrollment.examId), eq(sa.studentId, studentId)),
          with: {
            room: true,
          },
        })

        // Use description field in place of courseCode
        return {
          examId: enrollment.examId,
          studentId: enrollment.studentId,
          examTitle: enrollment.exam.title,
          courseCode: enrollment.exam.description || "No code", // Using description as courseCode
          date: enrollment.exam.date,
          startTime: enrollment.exam.startTime,
          endTime: enrollment.exam.endTime,
          location: enrollment.exam.location,
          roomNumber: seatingArrangement?.room.roomNumber || "Not assigned",
          seatNumber: seatingArrangement?.seatNumber || "Not assigned",
          status: seatingArrangement ? "Ready for download" : "Pending seating assignment",
        }
      })
    )

    return result
  } catch (error) {
    console.error("Error fetching hall tickets:", error)
    return []
  }
}

// Get all users (for admin)
export async function getAllUsers() {
  try {
    const allUsers = await db.query.users.findMany({
      orderBy: (users, { asc }) => [asc(users.name)],
    })

    // Remove password field from response
    return allUsers.map(({ password, ...user }) => user)
  } catch (error) {
    console.error("Error fetching users:", error)
    return []
  }
}

// Get all enrollments (for admin)
export async function getEnrollments() {
  try {
    const allEnrollments = await db.query.enrollments.findMany({
      with: {
        exam: {
          columns: {
            title: true,
            date: true,
            description: true, // Use description instead of courseCode
          },
        },
        student: {
          columns: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Transform to include courseCode from description
    return allEnrollments.map((enrollment) => ({
      ...enrollment,
      exam: {
        ...enrollment.exam,
        courseCode: enrollment.exam.description, // Add courseCode property derived from description
      },
    }))
  } catch (error) {
    console.error("Error fetching enrollments:", error)
    return []
  }
}

// Get all pending registrations (for admin)
export async function getPendingRegistrations() {
  try {
    const pendingRegs = await db.query.pendingRegistrations.findMany({
      orderBy: (pendingRegistrations, { desc }) => [desc(pendingRegistrations.createdAt)],
    })

    return pendingRegs
  } catch (error) {
    console.error("Error fetching pending registrations:", error)
    return []
  }
}

// Get exam results based on user role and ID
export async function getExamResults(userId: string, role: string) {
  try {
    if (role === "ADMIN") {
      // Admins can see all results
      return await db.query.examResults
        .findMany({
          with: {
            exam: {
              columns: {
                title: true,
                date: true,
                description: true, // Use description instead of courseCode
              },
            },
            student: {
              columns: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: (examResults, { desc }) => [desc(examResults.createdAt)],
        })
        .then((results) =>
          results.map((result) => ({
            ...result,
            exam: {
              ...result.exam,
              courseCode: result.exam.description, // Add courseCode property
            },
          }))
        )
    } else if (role === "STUDENT") {
      // Students can only see their own results
      return await db.query.examResults
        .findMany({
          where: (examResults, { eq }) => eq(examResults.studentId, userId),
          with: {
            exam: {
              columns: {
                title: true,
                date: true,
                description: true, // Use description instead of courseCode
              },
            },
          },
          orderBy: (examResults, { desc }) => [desc(examResults.createdAt)],
        })
        .then((results) =>
          results.map((result) => ({
            ...result,
            exam: {
              ...result.exam,
              courseCode: result.exam.description, // Add courseCode property
            },
          }))
        )
    }

    return []
  } catch (error) {
    console.error("Error fetching exam results:", error)
    return []
  }
}

// Get analytics data for admin dashboard
export async function getAnalyticsData() {
  try {
    // Get total students
    const students = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, "STUDENT"),
    })

    // Get total faculty
    const faculty = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.role, "FACULTY"),
    })

    // Get total exams
    const allExams = await db.query.exams.findMany()

    // Get total enrollments
    const allEnrollments = await db.query.enrollments.findMany()

    // Group exams by month
    const examsByMonth = allExams.reduce(
      (acc, exam) => {
        const date = new Date(exam.date)
        const month = date.toLocaleString("default", { month: "short" })

        const existingMonth = acc.find((item) => item.month === month)
        if (existingMonth) {
          existingMonth.count += 1
        } else {
          acc.push({ month, count: 1 })
        }

        return acc
      },
      [] as { month: string; count: number }[]
    )

    // Group enrollments by exam
    const enrollmentsByExam = await Promise.all(
      allExams.slice(0, 5).map(async (exam) => {
        const enrollments = await db.query.enrollments.findMany({
          where: (enrollments, { eq }) => eq(enrollments.examId, exam.id),
        })

        return {
          exam: exam.title,
          students: enrollments.length,
        }
      })
    )

    return {
      totalStudents: students.length,
      totalFaculty: faculty.length,
      totalExams: allExams.length,
      totalEnrollments: allEnrollments.length,
      examsByMonth,
      enrollmentsByExam,
    }
  } catch (error) {
    console.error("Error fetching analytics data:", error)
    return {
      totalStudents: 0,
      totalFaculty: 0,
      totalExams: 0,
      totalEnrollments: 0,
      examsByMonth: [],
      enrollmentsByExam: [],
    }
  }
}

// Get upcoming exams based on user role and ID
export async function getUpcomingExams(userId: string, role: string) {
  try {
    const today = new Date()

    if (role === "ADMIN") {
      // Admins see all upcoming exams
      return await db.query.exams.findMany({
        where: (exams, { gte }) => gte(exams.date, today),
        orderBy: (exams, { asc }) => [asc(exams.date)],
        limit: 5,
      })
    } else if (role === "FACULTY") {
      // Faculty see exams they're assigned to invigilate
      return await db.query.exams.findMany({
        where: (exams, { and, eq, gte }) => and(eq(exams.createdBy, userId), gte(exams.date, today)),
        orderBy: (exams, { asc }) => [asc(exams.date)],
        limit: 5,
      })
    } else {
      // Students see exams they're enrolled in
      const enrollments = await db.query.enrollments.findMany({
        where: (enrollments, { eq }) => eq(enrollments.studentId, userId),
        with: {
          exam: true,
        },
      })

      return enrollments
        .map((enrollment) => enrollment.exam)
        .filter((exam) => new Date(exam.date) >= today)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5)
    }
  } catch (error) {
    console.error("Error fetching upcoming exams:", error)
    return []
  }
}

// Get recent activity
export async function getRecentActivity() {
  try {
    // This is a placeholder function - in a real application, you would
    // have an activities table to track user actions

    // For now, we'll return mock data
    return [
      {
        id: "1",
        type: "enrollment",
        title: "New Enrollment",
        description: "A student enrolled in Mathematics Final Exam",
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
      },
      {
        id: "2",
        type: "exam",
        title: "Exam Created",
        description: "Physics Midterm exam was created",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      },
      {
        id: "3",
        type: "result",
        title: "Results Published",
        description: "Results for Computer Science Final were published",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
      },
      {
        id: "4",
        type: "registration",
        title: "New Registration",
        description: "A new student registration was approved",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
      },
    ]
  } catch (error) {
    console.error("Error fetching recent activity:", error)
    return []
  }
}
