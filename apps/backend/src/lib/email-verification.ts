import { createHmac, randomInt, timingSafeEqual } from "node:crypto"

import { MedusaError } from "@medusajs/framework/utils"

/*
 * Guest checkouts prove the address with a six-digit code before the order is
 * created. Codes are stored as an HMAC keyed by EMAIL_VERIFICATION_SECRET, and
 * a confirmed address yields a signed token the storefront sends back as a
 * header when it completes the cart.
 */

const CODE_VERSION = "code:v1"
const TOKEN_VERSION = "v1"
const TOKEN_PARTS = 3

/** Six digits, read off a phone screen and typed back. */
export const CODE_LENGTH = 6

/** How long a mailed code stays usable. */
export const CODE_TTL_MS = 10 * 60 * 1000

/** The shortest gap between two codes to the same address. */
export const RESEND_COOLDOWN_MS = 60 * 1000

/** The window the per-address send limit is counted over. */
export const SEND_WINDOW_MS = 60 * 60 * 1000

/** Codes one address may be sent per `SEND_WINDOW_MS`. */
export const MAX_SENDS_PER_WINDOW = 5

/** Wrong codes one mailed code survives before it is burned. */
export const MAX_ATTEMPTS = 5

/** How long a confirmed address stays proven for the next checkout. */
export const VERIFICATION_TTL_MS = 7 * 24 * 60 * 60 * 1000

/**
 * Addresses are compared and signed in one normal form, so `Ada@Example.com`
 * matches an address verified as `ada@example.com`.
 */
export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase()

const secret = (): string => {
  const value = process.env.EMAIL_VERIFICATION_SECRET

  // Refusing is the safe failure; a fallback secret would ship in the repo.
  if (!value || value.length < 32) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "EMAIL_VERIFICATION_SECRET must be set to at least 32 characters. See apps/backend/.env.template."
    )
  }

  return value
}

/** A uniformly random code, including leading zeros. */
export const generateCode = (): string =>
  String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0")

const codeDigest = (email: string, code: string): string =>
  createHmac("sha256", secret())
    .update(`${CODE_VERSION}:${normalizeEmail(email)}:${code}`)
    .digest("hex")

/** The value stored in the database in place of a mailed code. */
export const hashCode = (email: string, code: string): string =>
  codeDigest(email, code)

/** Constant-time comparison against the stored digest. */
export const codeMatches = (
  email: string,
  code: string,
  storedHash: string | null | undefined
): boolean => {
  if (!storedHash || code.length !== CODE_LENGTH || !/^\d+$/.test(code)) {
    return false
  }

  const expected = Buffer.from(storedHash)
  const actual = Buffer.from(codeDigest(email, code))

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

const sign = (email: string, expiresAt: number): string =>
  createHmac("sha256", secret())
    .update(`${TOKEN_VERSION}:${normalizeEmail(email)}:${expiresAt}`)
    .digest("base64url")

/** Token bound to one address until `expiresAt`. */
export const createVerificationToken = (
  email: string,
  {
    now = Date.now(),
    ttlMs = VERIFICATION_TTL_MS,
  }: { now?: number; ttlMs?: number } = {}
): { token: string; expiresAt: number } => {
  const expiresAt = now + ttlMs

  return {
    token: `${TOKEN_VERSION}.${expiresAt}.${sign(email, expiresAt)}`,
    expiresAt,
  }
}

export const verifyVerificationToken = (
  email: string | null | undefined,
  token: string | null | undefined,
  now: number = Date.now()
): boolean => {
  if (!email || !token) {
    return false
  }

  const parts = token.split(".")

  if (parts.length !== TOKEN_PARTS) {
    return false
  }

  const [version, expiresAtRaw, provided] = parts

  if (version !== TOKEN_VERSION) {
    return false
  }

  const expiresAt = Number(expiresAtRaw)

  // Checked before signing, so a stale token costs one comparison.
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return false
  }

  const expected = Buffer.from(sign(email, expiresAt))
  const actual = Buffer.from(provided)

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** The header the storefront sends when it completes a guest's cart. */
export const VERIFICATION_HEADER = "x-email-verification-token"
