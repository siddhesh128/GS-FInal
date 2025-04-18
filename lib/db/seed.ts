import { hashPassword } from "@/lib/auth"
import { db } from "@/lib/db"
import { exams, enrollments, seatingArrangements, users } from "@/lib/db/schema"

export async function seedDatabase() {
  try {
    console.log("Seeding database...")

    // Check if we already have users
    const existingUsers = await db.query.users.findMany({
      limit: 1,
    })

    if (existingUsers.length > 0) {
      console.log("Database already seeded")
      return
    }

    // Create admin user
    const adminPassword = await hashPassword("admin123")
    const [admin] = await db
      .insert(users)
      .values({
        name: "Admin User",
        email: "admin@example.com",
        password: adminPassword,
        role: "ADMIN",
      })
      .returning()

    console.log("Created admin user:", admin.email)

    // Create faculty users
    const facultyPassword = await hashPassword("faculty123")
    const facultyUsers = await db
      .insert(users)
      .values([
        {
          name: "John Smith",
          email: "john.smith@example.com",
          password: facultyPassword,
          role: "FACULTY",
        },
        {
          name: "Sarah Johnson",
          email: "sarah.johnson@example.com",
          password: facultyPassword,
          role: "FACULTY",
        },
      ])
      .returning()

    console.log(`Created ${facultyUsers.length} faculty users`)

    // Create student users
    const studentPassword = await hashPassword("student123")
    const studentUsers = await db
      .insert(users)
      .values([
        {
          name: "Alice Brown",
          email: "alice.brown@example.com",
          password: studentPassword,
          role: "STUDENT",
        },
        {
          name: "Bob Wilson",
          email: "bob.wilson@example.com",
          password: studentPassword,
          role: "STUDENT",
        },
        {
          name: "Charlie Davis",
          email: "charlie.davis@example.com",
          password: studentPassword,
          role: "STUDENT",
        },
      ])
      .returning()

    console.log(`Created ${studentUsers.length} student users`)

    // Create exams
    const examsList = await db
      .insert(exams)
      .values([
        {
          title: "Mathematics Final Exam",
          courseCode: "MATH101",
          date: new Date("2025-05-15T00:00:00Z"),
          startTime: "09:00",
          endTime: "11:00",
          location: "Main Hall",
          invigilatorId: facultyUsers[0].id,
        },
        {
          title: "Physics Midterm",
          courseCode: "PHYS201",
          date: new Date("2025-05-20T00:00:00Z"),
          startTime: "13:00",
          endTime: "15:00",
          location: "Science Building",
          invigilatorId: facultyUsers[1].id,
        },
        {
          title: "Computer Science Final",
          courseCode: "CS301",
          date: new Date("2025-05-25T00:00:00Z"),
          startTime: "10:00",
          endTime: "13:00",
          location: "Technology Center",
          invigilatorId: facultyUsers[0].id,
        },
      ])
      .returning()

    console.log(`Created ${examsList.length} exams`)

    // Create enrollments
    const enrollmentsList = []

    for (const student of studentUsers) {
      for (const exam of examsList) {
        enrollmentsList.push({
          examId: exam.id,
          studentId: student.id,
        })
      }
    }

    const createdEnrollments = await db.insert(enrollments).values(enrollmentsList).returning()
    console.log(`Created ${createdEnrollments.length} enrollments`)

    // Create seating arrangements
    const seatingList = []
    let roomCounter = 1
    let seatCounter = 1

    for (const enrollment of createdEnrollments) {
      seatingList.push({
        examId: enrollment.examId,
        studentId: enrollment.studentId,
        roomNumber: `R${roomCounter}`,
        seatNumber: `S${seatCounter}`,
      })

      seatCounter++
      if (seatCounter > 5) {
        seatCounter = 1
        roomCounter++
      }
    }

    const createdSeating = await db.insert(seatingArrangements).values(seatingList).returning()
    console.log(`Created ${createdSeating.length} seating arrangements`)

    console.log("Database seeded successfully!")

    return {
      admin,
      faculty: facultyUsers,
      students: studentUsers,
      exams: examsList,
      enrollments: createdEnrollments,
      seating: createdSeating,
    }
  } catch (error) {
    console.error("Error seeding database:", error)
    throw error
  }
}
