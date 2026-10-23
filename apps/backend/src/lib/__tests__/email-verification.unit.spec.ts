import {
  CODE_LENGTH,
  MAX_ATTEMPTS,
  codeMatches,
  createVerificationToken,
  generateCode,
  hashCode,
  normalizeEmail,
  verifyVerificationToken,
} from "../email-verification"

/*
 * The two secrets of the email verification flow, tested without a database or
 * a mail provider: a code is only accepted for the address it was mailed to,
 * and a token is only accepted for the address and the window it was minted
 * for. Both are what the cart-completion gate relies on.
 */
const SECRET = "unit-test-email-verification-secret-0123456789"

describe("email verification codes", () => {
  beforeAll(() => {
    process.env.EMAIL_VERIFICATION_SECRET = SECRET
  })

  it("normalises an address the way the signature expects", () => {
    expect(normalizeEmail("  Ada@Example.COM ")).toBe("ada@example.com")
  })

  it("mints a code of the stated length, digits only, leading zeros allowed", () => {
    for (let i = 0; i < 100; i += 1) {
      const code = generateCode()

      expect(code).toHaveLength(CODE_LENGTH)
      expect(code).toMatch(/^\d+$/)
    }
  })

  it("accepts the code that was hashed for the address", () => {
    const code = "004211"
    const hash = hashCode("ada@example.com", code)

    expect(hash).not.toContain(code)
    expect(codeMatches("ada@example.com", code, hash)).toBe(true)
    // The same normal form, typed with different casing and spacing.
    expect(codeMatches("  ADA@example.com ", code, hash)).toBe(true)
  })

  it("rejects the right code for the wrong address", () => {
    const hash = hashCode("ada@example.com", "123456")

    expect(codeMatches("grace@example.com", "123456", hash)).toBe(false)
  })

  it("rejects a wrong or malformed code", () => {
    const hash = hashCode("ada@example.com", "123456")

    expect(codeMatches("ada@example.com", "123457", hash)).toBe(false)
    expect(codeMatches("ada@example.com", "12345", hash)).toBe(false)
    expect(codeMatches("ada@example.com", "12345a", hash)).toBe(false)
    expect(codeMatches("ada@example.com", "", hash)).toBe(false)
    expect(codeMatches("ada@example.com", "123456", null)).toBe(false)
  })

  it("does not hash the same code the same way for another address", () => {
    expect(hashCode("ada@example.com", "123456")).not.toBe(
      hashCode("grace@example.com", "123456")
    )
  })

  it("bursts fewer than a million-guess brute force onto five attempts", () => {
    // The stored value is an HMAC, not a hash of a six-digit space; the attempt
    // limit is the second wall (`MAX_ATTEMPTS`), which the workflow enforces.
    expect(MAX_ATTEMPTS).toBeLessThanOrEqual(5)
  })
})

describe("email verification tokens", () => {
  beforeAll(() => {
    process.env.EMAIL_VERIFICATION_SECRET = SECRET
  })

  it("verifies the token it minted, for the address it was minted for", () => {
    const { token } = createVerificationToken("ada@example.com")

    expect(verifyVerificationToken("ada@example.com", token)).toBe(true)
    expect(verifyVerificationToken("ADA@example.com", token)).toBe(true)
  })

  it("does not verify against another address", () => {
    const { token } = createVerificationToken("ada@example.com")

    expect(verifyVerificationToken("grace@example.com", token)).toBe(false)
  })

  it("does not verify a token whose signature was changed", () => {
    const { token } = createVerificationToken("ada@example.com")
    const [version, expiresAt] = token.split(".")

    expect(
      verifyVerificationToken("ada@example.com", `${version}.${expiresAt}.nope`)
    ).toBe(false)
  })

  it("does not verify a token whose expiry was pushed out", () => {
    const { token } = createVerificationToken("ada@example.com")
    const [, , signature] = token.split(".")
    const extended = `v1.${Date.now() + 400 * 24 * 60 * 60 * 1000}.${signature}`

    expect(verifyVerificationToken("ada@example.com", extended)).toBe(false)
  })

  it("stops verifying once the window has passed", () => {
    const now = Date.now()
    const { token, expiresAt } = createVerificationToken(
      "ada@example.com",
      { now, ttlMs: 60_000 }
    )

    expect(expiresAt).toBe(now + 60_000)
    expect(verifyVerificationToken("ada@example.com", token, now + 59_000)).toBe(
      true
    )
    expect(verifyVerificationToken("ada@example.com", token, now + 61_000)).toBe(
      false
    )
  })

  it("rejects a missing, empty or malformed token", () => {
    expect(verifyVerificationToken("ada@example.com", undefined)).toBe(false)
    expect(verifyVerificationToken("ada@example.com", null)).toBe(false)
    expect(verifyVerificationToken("ada@example.com", "")).toBe(false)
    expect(verifyVerificationToken("ada@example.com", "nonsense")).toBe(false)
    expect(verifyVerificationToken("ada@example.com", "v1.nope.sig")).toBe(false)
    expect(verifyVerificationToken(null, "v1.1.sig")).toBe(false)
  })

  it("refuses to sign without a usable secret", () => {
    const { token } = createVerificationToken("ada@example.com")

    process.env.EMAIL_VERIFICATION_SECRET = "too-short"

    expect(() => createVerificationToken("ada@example.com")).toThrow(
      /EMAIL_VERIFICATION_SECRET/
    )
    // Verification is the other half of the same failure: it must not fall back
    // to accepting anything.
    expect(() => verifyVerificationToken("ada@example.com", token)).toThrow(
      /EMAIL_VERIFICATION_SECRET/
    )

    process.env.EMAIL_VERIFICATION_SECRET = SECRET
  })
})
