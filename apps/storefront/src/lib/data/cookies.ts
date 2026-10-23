import "server-only"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | Record<string, never>
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch {
    return ""
  }
}

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | Record<string, never>> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
}

// `sameSite: "lax"` rather than `"strict"`: the customer returns from a
// redirect-based payment method (iDEAL, Bancontact, ...) via a cross-site
// top-level navigation. A "strict" cookie is withheld on that navigation, so
// the storefront would see a logged-out, cartless visitor and render a 404 for
// the checkout page instead of resuming the order. "lax" is sent on top-level
// GET navigations while still blocking cross-site subrequests.
export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export type PendingCustomer = {
  email: string
  first_name?: string
  last_name?: string
  phone?: string
}

// During the email verification flow the customer record isn't created until
// the customer verifies their email and logs in. We temporarily persist the
// extra signup fields in a cookie so they survive the customer leaving to open
// their inbox, and read them back when creating the customer at login.
export const setPendingCustomer = async (customer: PendingCustomer) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_customer", JSON.stringify(customer), {
    maxAge: 60 * 60 * 24,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const getPendingCustomer = async (): Promise<PendingCustomer | null> => {
  const cookies = await nextCookies()
  const value = cookies.get("_medusa_pending_customer")?.value

  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as PendingCustomer
  } catch {
    return null
  }
}

export const removePendingCustomer = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_pending_customer", "", {
    maxAge: -1,
  })
}

/*
 * Where a redirect-based sign-in (Google) should land once it comes back. The
 * round trip leaves this origin and returns on a *new* request, so the
 * destination has to be kept somewhere the browser carries: the callback route
 * has no memory of which page asked for the sign-in.
 *
 * `sameSite: "lax"` for the same reason as the auth cookie: returning from
 * Google is a cross-site top-level navigation.
 */
export const setAuthReturnPath = async (path: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_auth_return", path, {
    maxAge: 60 * 15,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const getAuthReturnPath = async (): Promise<string | null> => {
  try {
    const cookies = await nextCookies()
    return cookies.get("_medusa_auth_return")?.value ?? null
  } catch {
    return null
  }
}

export const removeAuthReturnPath = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_auth_return", "", {
    maxAge: -1,
  })
}

/*
 * Proof that this browser confirmed the address it is checking out with.
 *
 * The token is signed by the backend and bound to one address; the storefront
 * only carries it. It lives in an HttpOnly cookie so a script on the page
 * cannot read it, and it is sent as a header when the cart is completed — the
 * backend is what checks it, and it refuses a token for a different address.
 *
 * `sameSite: "lax"` for the same reason as the cart cookie: a redirect-based
 * payment returns here with a cross-site top-level navigation.
 */
export type EmailVerificationCookie = {
  email: string
  /** Expiry is inside the token; the cookie's own lifetime mirrors it. */
  token: string
  expires_at: number
}

export const setEmailVerification = async ({
  email,
  token,
  expires_at,
}: EmailVerificationCookie) => {
  const cookies = await nextCookies()

  cookies.set(
    "_medusa_email_verification",
    JSON.stringify({ email, token, expires_at }),
    {
      maxAge: Math.max(0, Math.floor((expires_at - Date.now()) / 1000)),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    }
  )
}

export const getEmailVerification = async (): Promise<EmailVerificationCookie | null> => {
  try {
    const cookies = await nextCookies()
    const value = cookies.get("_medusa_email_verification")?.value

    if (!value) {
      return null
    }

    const parsed = JSON.parse(value) as Partial<EmailVerificationCookie>

    if (
      typeof parsed.email !== "string" ||
      typeof parsed.token !== "string" ||
      typeof parsed.expires_at !== "number" ||
      parsed.expires_at <= Date.now()
    ) {
      return null
    }

    return {
      email: parsed.email,
      token: parsed.token,
      expires_at: parsed.expires_at,
    }
  } catch {
    return null
  }
}

export const removeEmailVerification = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_email_verification", "", { maxAge: -1 })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

// See the note on `setAuthToken`: `sameSite: "lax"` so the cart cookie survives
// the cross-site return navigation from a redirect-based payment method.
export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}
