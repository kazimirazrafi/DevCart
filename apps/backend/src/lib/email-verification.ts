import { createHmac, randomInt, timingSafeEqual } from "node:crypto"

import { MedusaError } from "@medusajs/framework/utils"

/*
 * Proving a guest can read the address they are checking out with.
 *
 * A guest order is sent to whatever address was typed at the contact step and
 * nobody has to prove it exists. A typo means the customer never receives the
 * confirmation, the shipment notice or the order link; an invented address
 * means the store ships goods for an order whose buyer cannot be reached. So
 * the address is proved before the order is created: a six-digit code is
 * mailed to it, and the customer types it back on the same page.
 *
 * Two secrets, one for each job:
 *
 * - The code is stored as an HMAC rather than a hash, because a six-digit code
 *   has only a million possibilities — a plain hash in a leaked database is
 *   brute-forced in seconds. The key never leaves the environment.
 * - A successful confirmation returns a signed token, which is what the cart's
 *   completion reads later. The token is bound to the address, so it proves
 *   nothing about a different one, and it expires on its own. The token is
 *   handed to the storefront, which keeps it in an HttpOnly cookie and sends it
 *   back as a header when it completes the cart.
 *
 * The storefront never signs or checks anything: it stores the token and the
 * backend decides. That is why the same file has no counterpart in the
 * storefront, unlike `order-access.ts`.
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
 * Addresses are compared and signed in one normal form. The local part of an
 * address is technically case-sensitive, but no mail provider this store can
 * deliver to treats it that way, and a customer who types `Ada@Example.com`
 * after verifying `ada@example.com` would be asked to verify twice.
 */
export const normalizeEmail = (email: string): string =>
  email.trim().toLowerCase()

const secret = (): string => {
  const value = process.env.EMAIL_VERIFICATION_SECRET

  /*
   * Refusing to sign or verify is the safe failure. A fallback secret would
   * make every deployment that forgot the variable use a value from the
   * repository, which is the same as storing plain codes.
   */
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

/**
 * Whether a typed code is the one that was mailed to this address. The digest
 * of the typed code is compared against the stored one in constant time, so the
 * comparison itself does not say how much of the code was right.
 */
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

/**
 * Proof that this address was confirmed, until `expiresAt`. The address is part
 * of what is signed, so the token cannot be moved to another one.
 */
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

  // Expired or malformed. Checked before signing so a stale token costs one
  // comparison rather than an HMAC.
  if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
    return false
  }

  const expected = Buffer.from(sign(email, expiresAt))
  const actual = Buffer.from(provided)

  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/** The header the storefront sends when it completes a guest's cart. */
export const VERIFICATION_HEADER = "x-email-verification-token"
