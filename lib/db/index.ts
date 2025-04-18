import { neon } from "@neondatabase/serverless"
import { drizzle } from "drizzle-orm/neon-http"

import * as schema from "./schema"

// Check if the DATABASE_URL environment variable is set
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set")
}

// Create a Neon connection
const sql = neon(process.env.DATABASE_URL)

// Create a Drizzle instance
export const db = drizzle(sql, { schema })
