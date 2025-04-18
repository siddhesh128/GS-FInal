import { cookies } from "next/headers"
import { jwtVerify, SignJWT } from "jose"
import bcrypt from "bcryptjs"

// Secret key for JWT
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret_please_change_in_production")

// Session expiration time (24 hours)
const EXPIRATION_TIME = 60 * 60 * 24

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Compare password with hash
export async function comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Create a session for a user
export async function createSession(user: any) {
  // Create a JWT token
  const token = await new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRATION_TIME}s`)
    .sign(JWT_SECRET)

  // Set the cookie
  const cookie = `auth_token=${token}; Path=/; HttpOnly; Max-Age=${EXPIRATION_TIME}; SameSite=Lax`

  return { token, cookie }
}

// Destroy a session
export async function destroySession() {
  return `auth_token=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`
}

// Get the current session
export async function getSession() {
  const cookieStore =  await cookies()
  const token = cookieStore.get("auth_token")

  if (!token) {
    return null
  }

  try {
    const { payload } = await jwtVerify(token.value, JWT_SECRET)

    return {
      user: {
        id: payload.id as string,
        name: payload.name as string,
        email: payload.email as string,
        role: payload.role as string,
      },
    }
  } catch (error) {
    console.error("Session verification error:", error)
    return null
  }
}
