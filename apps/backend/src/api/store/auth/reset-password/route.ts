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
 * Sets a new password from the single-use token in the reset email.
 *
 * Medusa's own `/auth/customer/emailpass/update` stops after the password
 * write: for an address that already had a customer (one created with Google,
 * say) the password ends up on an unlinked auth identity, so signing in with it
 * authenticates nobody. This route verifies the same reset token, then runs a
 * workflow that stores the password and associates the identity with the
 * customer who owns the address — the one moment where reading the inbox has
 * been proven, which is what makes the association safe.
 *
 * The token check mirrors the core update route on purpose: signature and actor
 * type via the framework's own verifier, then the stored token row (consumed by
 * the workflow) for expiry, provider and single use.
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
