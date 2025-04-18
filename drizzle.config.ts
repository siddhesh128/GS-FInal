import type { Config } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

export default {
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || "postgresql://neondb_owner:npg_Lrt7s3fGklav@ep-icy-fog-a11jc1un.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  },
} as Config;