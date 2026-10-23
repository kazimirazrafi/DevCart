"use server"

import { sdk } from "@lib/config"
import type { CheckoutStepState } from "@lib/util/checkout-validation"
import { HttpTypes } from "@medusajs/types"
import { redirect } from "next/navigation"

import {
  getCartId,
  getEmailVerification,
  removeEmailVerification,
  setEmailVerification,
} from "./cookies"

/*
 * The checkout's half of guest email verification.
 *
 * The backend mails a six-digit code and, when it is typed back, answers with a
 * signed token. This module carries that token in an HttpOnly cookie and reads
 * the two answers it cannot get from the SDK: whether a code was accepted, and
 * why one was not. The SDK keeps only the HTTP status and the top-level
 * message, and the useful part here is `error.code` (`invalid_code`,
 * `expired_code`, `too_many_attempts`, `resend_cooldown`), so the two routes are
 * called directly instead of through `sdk.client`.
 */

const backendUrl = () =>
  (process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000").replace(
    /\/+$/,
    ""
  )

type ApiFailure = {
  ok: false
  status: number
  code: string
  message: string
  retryAfter?: number
  /** How many tries a wrong code has left before it is burned. */
  attemptsLeft?: number
}

type ApiSuccess<T> = { ok: true; data: T }

const postJson = async <T>(
  path: string,
  body: Record<string, unknown>
): Promise<ApiSuccess<T> | ApiFailure> => {
  try {
    const response = await fetch(`${backendUrl()}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
          ? {
              "x-publishable-api-key":
                process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
            }
          : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    })

    const payload = await response.json().catch(() => null)

    if (response.ok) {
      return { ok: true, data: payload as T }
    }

    const error = (payload as { error?: Record<string, unknown> } | null)?.error

    return {
      ok: false,
      status: response.status,
      code: typeof error?.code === "string" ? error.code : "unknown",
      message:
        typeof error?.message === "string"
          ? error.message
          : "Something went wrong. Try again.",
      retryAfter:
        typeof error?.retry_after_seconds === "number"
          ? error.retry_after_seconds
          : Number(response.headers.get("retry-after")) || undefined,
      attemptsLeft:
        typeof error?.attempts_left === "number"
          ? error.attempts_left
          : undefined,
    }
  } catch (error) {
    console.error("Email verification request failed:", error)

    return {
      ok: false,
      status: 0,
      code: "network",
      message:
        "Could not reach the store. Check your connection and try again.",
    }
  }
}

/** Addresses are compared the way the backend signs them. */
const normalizeVerificationEmail = (email: string) =>
  email.trim().toLowerCase()

/**
 * The cart's address, read from the server rather than from the form: the code
 * is checked against the address the order will be sent to, so a hidden input
 * cannot point it at a different one.
 */
const cartEmail = async (): Promise<string | null> => {
  const cartId = await getCartId()

  if (!cartId) {
    return null
  }

  return await sdk.client
    .fetch<{ cart: HttpTypes.StoreCart }>(`/store/carts/${cartId}`, {
      method: "GET",
      query: { fields: "id,email" },
      cache: "no-store",
    })
    .then(({ cart }) => cart.email ?? null)
    .catch(() => null)
}

/**
 * Whether this browser already proved it reads `email`. Only the presence and
 * the address are read here; the signature is the backend's to check when the
 * cart is completed, which is why nothing in the storefront can grant itself an
 * order by writing a cookie.
 */
export const isEmailVerified = async (email: string): Promise<boolean> => {
  const verification = await getEmailVerification()

  return Boolean(
    verification &&
      normalizeVerificationEmail(verification.email) ===
        normalizeVerificationEmail(email)
  )
}

/** The header that carries the token to `POST /store/carts/:id/complete`. */
export const emailVerificationHeaders = async (): Promise<
  Record<string, string>
> => {
  const verification = await getEmailVerification()

  return verification
    ? { "x-email-verification-token": verification.token }
    : {}
}

/** Forgets a verification that belongs to a different address. */
export const forgetVerificationFor = async (email: string) => {
  const verification = await getEmailVerification()

  if (
    verification &&
    normalizeVerificationEmail(verification.email) !==
      normalizeVerificationEmail(email)
  ) {
    await removeEmailVerification()
  }
}

export type RequestCodeResult =
  | { ok: true; resendAfter: number }
  | ApiFailure

/** Mails a code. Used by the contact step's own submit, not by the browser. */
export async function requestVerificationCode(
  email: string
): Promise<RequestCodeResult> {
  const result = await postJson<{
    sent: boolean
    resend_after_seconds: number
  }>("/store/email-verification/request", { email })

  return result.ok
    ? { ok: true, resendAfter: result.data.resend_after_seconds }
    : result
}

/** What a verification form hands back, beyond what checkout steps share. */
export type VerificationActionState =
  | {
      message?: string
      fields?: Record<string, string>
      /** A fresh code was mailed, so the resend countdown starts again. */
      resent?: boolean
    }
  | null

/** Step 1's resend control. */
export async function resendVerificationCode(
  _state: VerificationActionState
): Promise<VerificationActionState> {
  const email = await cartEmail()

  if (!email) {
    return {
      message: "Your cart has expired. Add something to it and try again.",
    }
  }

  const result = await requestVerificationCode(email)

  return result.ok
    ? { message: `A new code is on its way to ${email}.`, resent: true }
    : { message: result.message }
}

/**
 * Step 1's code form. A correct code is stored as a cookie and the customer
 * moves on to the address; a wrong one keeps them here with the reason, because
 * the alternative — trusting the browser and finding out at the review step —
 * would take an address and a delivery choice first.
 */
export async function confirmVerificationCode(
  _state: CheckoutStepState,
  formData: FormData
): Promise<CheckoutStepState> {
  const code = String(formData.get("code") ?? "")
    .replace(/\s+/g, "")
    .trim()
  const countryCode = String(formData.get("country_code") ?? "")

  if (!/^\d{6}$/.test(code)) {
    return {
      fields: { code: "Enter the six-digit code we emailed you." },
      message: "That code does not look right.",
    }
  }

  const email = await cartEmail()

  if (!email) {
    return {
      message: "Your cart has expired. Add something to it and try again.",
    }
  }

  const result = await postJson<{
    verified: boolean
    token: string
    expires_at: number
  }>("/store/email-verification/confirm", { email, code })

  if (!result.ok) {
    /*
     * A wrong code costs one of five tries, and the customer cannot see the
     * countdown anywhere else: saying how many are left is what tells them to
     * slow down before the code is burned and they need a new one.
     */
    const remaining = result.attemptsLeft

    return {
      message:
        result.code === "invalid_code" && typeof remaining === "number" && remaining > 0
          ? `${result.message} ${remaining} ${
              remaining === 1 ? "attempt" : "attempts"
            } left.`
          : result.message,
    }
  }

  await setEmailVerification({
    email,
    token: result.data.token,
    expires_at: result.data.expires_at,
  })

  redirect(`/${countryCode}/checkout?step=address`)
}
