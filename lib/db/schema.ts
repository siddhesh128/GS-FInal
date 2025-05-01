import { relations } from "drizzle-orm"
import { boolean, integer, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core"

// Enums
export const userRoleEnum = pgEnum("user_role", ["ADMIN", "FACULTY", "STUDENT"])
export const registrationStatusEnum = pgEnum("registration_status", ["PENDING", "APPROVED", "REJECTED"])
export const attendanceStatusEnum = pgEnum("attendance_status", ["PRESENT", "ABSENT", "LATE"])
export const yearEnum = pgEnum("year", ["FE", "SE", "TE", "BE"])

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("STUDENT"),
  department: text("department"),
  year: yearEnum("year"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  exams: many(exams),
  enrollments: many(enrollments),
  seatingArrangements: many(seatingArrangements),
  attendanceMarked: many(attendance, { relationName: "attendanceMarker" }),
  attendanceRecords: many(attendance, { relationName: "studentAttendance" }),
  verificationCodes: many(verificationCodes),
}))

// Subjects table
export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Subject relations
export const subjectsRelations = relations(subjects, ({ many }) => ({
  examSubjects: many(examSubjects),
  subjectSchedules: many(subjectSchedules),
}))

// Buildings table
export const buildings = pgTable("buildings", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  number: text("number").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Building relations
export const buildingsRelations = relations(buildings, ({ many }) => ({
  rooms: many(rooms),
}))

// Rooms table
export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => buildings.id, { onDelete: "cascade" }),
  roomNumber: text("room_number").notNull(),
  floor: text("floor").notNull(),
  capacity: integer("capacity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Room relations
export const roomsRelations = relations(rooms, ({ one, many }) => ({
  building: one(buildings, {
    fields: [rooms.buildingId],
    references: [buildings.id],
  }),
  seatingArrangements: many(seatingArrangements),
  attendanceRecords: many(attendance),
}))

// Exams table
export const exams = pgTable("exams", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  location: text("location"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Exam relations
export const examsRelations = relations(exams, ({ one, many }) => ({
  creator: one(users, {
    fields: [exams.createdBy],
    references: [users.id],
  }),
  enrollments: many(enrollments),
  seatingArrangements: many(seatingArrangements),
  examSubjects: many(examSubjects),
  attendanceRecords: many(attendance),
}))

// Exam Subjects join table
export const examSubjects = pgTable(
  "exam_subjects",
  {
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.examId, t.subjectId] }),
  }),
)

// Exam Subjects relations
export const examSubjectsRelations = relations(examSubjects, ({ one }) => ({
  exam: one(exams, {
    fields: [examSubjects.examId],
    references: [exams.id],
  }),
  subject: one(subjects, {
    fields: [examSubjects.subjectId],
    references: [subjects.id],
  }),
}))

// Enrollments table
export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(), // Added a unique ID field
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
  }
)

// Enrollment relations
export const enrollmentsRelations = relations(enrollments, ({ one, many }) => ({
  exam: one(exams, {
    fields: [enrollments.examId],
    references: [exams.id],
  }),
  student: one(users, {
    fields: [enrollments.studentId],
    references: [users.id],
  }),
  subjectSchedules: many(subjectSchedules),
}))

// Subject Schedules table - stores subject-specific dates and times for exams
export const subjectSchedules = pgTable("subject_schedules", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id") // Added examId field
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  enrollmentId: uuid("enrollment_id")
    .references(() => enrollments.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Subject Schedules relations
export const subjectSchedulesRelations = relations(subjectSchedules, ({ one }) => ({
  exam: one(exams, {
    fields: [subjectSchedules.examId],
    references: [exams.id],
  }),
  enrollment: one(enrollments, {
    fields: [subjectSchedules.enrollmentId],
    references: [enrollments.id],
  }),
  subject: one(subjects, {
    fields: [subjectSchedules.subjectId],
    references: [subjects.id],
  }),
}))

// Seating Arrangements table
export const seatingArrangements = pgTable("seating_arrangements", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  seatNumber: text("seat_number").notNull(),
  invigilatorId: uuid("invigilator_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Seating Arrangement relations
export const seatingArrangementsRelations = relations(seatingArrangements, ({ one }) => ({
  exam: one(exams, {
    fields: [seatingArrangements.examId],
    references: [exams.id],
  }),
  subject: one(subjects, {
    fields: [seatingArrangements.subjectId],
    references: [subjects.id],
  }),
  student: one(users, {
    fields: [seatingArrangements.studentId],
    references: [users.id],
  }),
  room: one(rooms, {
    fields: [seatingArrangements.roomId],
    references: [rooms.id],
  }),
  invigilator: one(users, {
    fields: [seatingArrangements.invigilatorId],
    references: [users.id],
  }),
}))

// Attendance table
export const attendance = pgTable("attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  status: attendanceStatusEnum("status").notNull().default("PRESENT"),
  markedBy: uuid("marked_by")
    .notNull()
    .references(() => users.id),
  markedAt: timestamp("marked_at").defaultNow().notNull(),
})

// Attendance relations
export const attendanceRelations = relations(attendance, ({ one }) => ({
  exam: one(exams, {
    fields: [attendance.examId],
    references: [exams.id],
  }),
  subject: one(subjects, {
    fields: [attendance.subjectId],
    references: [subjects.id],
  }),
  student: one(users, {
    fields: [attendance.studentId],
    references: [users.id],
    relationName: "studentAttendance",
  }),
  room: one(rooms, {
    fields: [attendance.roomId],
    references: [rooms.id],
  }),
  marker: one(users, {
    fields: [attendance.markedBy],
    references: [users.id],
    relationName: "attendanceMarker",
  }),
}))

// Registrations table
export const registrations = pgTable("registrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").notNull().default("STUDENT"),
  status: registrationStatusEnum("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
})

// Pending Registrations table
export const pendingRegistrations = pgTable("pending_registrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  department: text("department"),
  year: yearEnum("year"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Verification Codes table
export const verificationCodes = pgTable("verification_codes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Verification Codes relations
export const verificationCodesRelations = relations(verificationCodes, ({ one }) => ({
  user: one(users, {
    fields: [verificationCodes.userId],
    references: [users.id],
  }),
}))

// Registration Verifications table
export const registrationVerifications = pgTable("registration_verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Notifications table
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  isRead: text("read").notNull().default("false"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Notification relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

// Exam Results table
export const examResults = pgTable("exam_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  examId: uuid("exam_id")
    .notNull()
    .references(() => exams.id, { onDelete: "cascade" }),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  studentId: uuid("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  score: text("score").notNull(),
  grade: text("grade").notNull(),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
})

// Exam Results relations
export const examResultsRelations = relations(examResults, ({ one }) => ({
  exam: one(exams, {
    fields: [examResults.examId],
    references: [exams.id],
  }),
  subject: one(subjects, {
    fields: [examResults.subjectId],
    references: [subjects.id],
  }),
  student: one(users, {
    fields: [examResults.studentId],
    references: [users.id],
  }),
}))
