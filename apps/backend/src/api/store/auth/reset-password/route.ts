import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getAuthContextFromJwtToken } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"

import { resetPasswordWorkflow } from "../../../../workflows/reset-password"

type ResetPasswordBody = {
  token?: string
  password?: string
}

const MIN_PASSWORD_LENGTH = 8

/**
 * Sets a new password from the reset email's token. Medusa's own update route
 * leaves the new password on an unlinked identity for customers created through
 * Google, so the workflow here stores it and links the identity to the customer.
 */
export async function POST(
  req: MedusaRequest<ResetPasswordBody>,
  res: MedusaResponse
) {
  const { token, password } = req.body ?? {}

  if (
    !password ||
    typeof password !== "string" ||
    password.length < MIN_PASSWORD_LENGTH
  ) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Use at least ${MIN_PASSWORD_LENGTH} characters for your new password.`
    )
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
  const { http } = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE)
    .projectConfig

  if (!http.jwtSecret) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The backend is missing its JWT secret."
    )
  }

  const claims = token
    ? getAuthContextFromJwtToken(
        `Bearer ${token}`,
        http.jwtSecret,
        ["bearer"],
        ["customer"],
        http.jwtPublicKey,
        http.jwtVerifyOptions ?? http.jwtOptions,
        logger
      )
    : null

  if (
    !claims?.entity_id ||
    claims.purpose !== "reset" ||
    typeof claims.jti !== "string"
  ) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Invalid or expired reset token."
    )
  }

  await resetPasswordWorkflow(req.scope).run({
    input: {
      email: claims.entity_id,
      password,
      jti: claims.jti,
    },
  })

  res.status(200).json({ success: true })
}
