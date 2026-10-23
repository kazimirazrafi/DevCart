"use server"

import { sdk } from "@lib/config"
import medusaErrorMessage from "@lib/util/medusa-error"

export type PasswordResetRequestState =
  | { state: "success"; email: string }
  | { state: "error"; error: string }
  | null

export type PasswordResetState =
  | { state: "success" }
  | { state: "error"; error: string; field?: "password" | "confirm_password" }
  | null

/**
 * Asks Medusa to start the reset. The API answers `201` whether or not the
 * address has an account, on purpose — otherwise this form would be a way to
 * ask the store who its customers are. The answer to the customer is therefore
 * the same in both cases, and says what to do next rather than claiming an
 * email was sent.
 *
 * The email itself is a subscriber's job (backend `auth.password_reset`), so
 * nothing here waits for delivery.
 */
export async function requestPasswordReset(
  _currentState: unknown,
  formData: FormData
): Promise<PasswordResetRequestState> {
  const email = String(formData.get("email") ?? "").trim()

  if (!email) {
    return { state: "error", error: "Enter the email address on your account." }
  }

  try {
    /*
     * The route answers `201 Created` with a plain-text body, not JSON. The SDK
     * parses the response only when `accept` asks for JSON, so asking for text
     * here is what keeps its parser from turning a successful request into
     * "Unexpected token 'C', \"Created\" is not valid JSON" — measured before
     * this line existed, while the email itself was already on its way.
     */
    await sdk.client.fetch("/auth/customer/emailpass/reset-password", {
      method: "POST",
      body: { identifier: email },
      headers: { accept: "text/plain" },
    })

    return { state: "success", email }
  } catch (error) {
    return { state: "error", error: medusaErrorMessage(error) }
  }
}

/**
 * Sets the new password with the single-use token from the emailed link.
 *
 * The backend route validates the token itself: it has to be signed for this
 * purpose, it expires after fifteen minutes, and it is consumed on first use,
 * so a second submission of the same link is refused. That refusal is what the
 * customer reads here, with the way out (ask for a new link) rather than
 * "invalid token". The route also links the identity to an existing customer
 * (one created with Google, or by registering this address) — without that,
 * the password would log in to an identity no customer record belongs to.
 */
export async function resetPassword(
  _currentState: unknown,
  formData: FormData
): Promise<PasswordResetState> {
  const token = String(formData.get("token") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const confirmation = String(formData.get("confirm_password") ?? "")

  if (!token) {
    return {
      state: "error",
      error: "This link is missing its token. Ask for a new reset link.",
    }
  }

  if (password.length < 8) {
    return {
      state: "error",
      error: "Use at least 8 characters for your new password.",
      field: "password",
    }
  }

  if (password !== confirmation) {
    return {
      state: "error",
      error: "The two passwords do not match.",
      field: "confirm_password",
    }
  }

  try {
    await sdk.client.fetch("/store/auth/reset-password", {
      method: "POST",
      body: { token, password },
    })

    return { state: "success" }
  } catch (error) {
    const status = (error as { status?: number })?.status

    if (status === 401) {
      return {
        state: "error",
        error:
          "This reset link has expired or was already used. Ask for a new one.",
      }
    }

    return { state: "error", error: medusaErrorMessage(error) }
  }
}
