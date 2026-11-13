import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const SESSION_COOKIE_NAME = 'gap_session';

// Encode the session secret from environment variables
function getSecretKey() {
  const secret = process.env.SESSION_SECRET || 'local-dev-secret-change-me-before-deploy';
  return new TextEncoder().encode(secret);
}

// Hash a plain-text password using bcryptjs
export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Compare a plain-text password against a stored bcrypt hash
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// Create a signed JWT session token for a logged-in user
export async function createSessionToken(user) {
  return new SignJWT({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

// Verify a JWT session token and return its payload, or null if invalid
export async function verifySessionToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

// Read and verify the current user's session from HTTP-only cookies
export async function getSession() {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

// Guard API routes by checking authentication and optional required role
export async function requireRole(expectedRole) {
  const user = await getSession();
  if (!user) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Not signed in' }, { status: 401 }),
    };
  }
  if (expectedRole && user.role !== expectedRole) {
    return {
      user: null,
      errorResponse: NextResponse.json({ error: 'Access denied' }, { status: 403 }),
    };
  }
  return { user, errorResponse: null };
}

