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
 * Asks Medusa to start the reset. The API answers 201 whether or not the address
 * has an account, so the response cannot be used to discover customers. The
 * email is sent by a backend subscriber; nothing here waits for delivery.
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
    // The route answers with plain text, and the SDK only parses JSON when asked,
    // so accept text or a successful request throws a parse error.
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
 * Sets the new password with the single-use token from the emailed link. The
 * backend validates the token: signed for this purpose, valid for fifteen
 * minutes, consumed on first use. It also links the identity to an existing
 * customer record for the same address.
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
