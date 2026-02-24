import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { logger } from "@/lib/logger";

const JWT_SECRET_RAW = process.env.JWT_SECRET;

function getSecretKey(): Uint8Array {
  if (!JWT_SECRET_RAW) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(JWT_SECRET_RAW);
}

/**
 * Sign a JWT for the given user ID.
 * Payload: { sub: userId, iat, exp (30 days) }
 */
export async function signJWT(userId: string): Promise<string> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecretKey());

  return token;
}

/**
 * Verify a JWT and return its payload.
 * Throws on invalid/expired tokens.
 */
export async function verifyJWT(token: string): Promise<{ sub: string }> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());

    if (!payload.sub) {
      throw new Error("JWT missing sub claim");
    }

    return { sub: payload.sub };
  } catch (error) {
    logger.debug({ error }, "JWT verification failed");
    throw error;
  }
}
