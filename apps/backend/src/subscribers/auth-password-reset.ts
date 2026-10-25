import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  AuthWorkflowEvents,
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { EMAIL_TEMPLATES } from "../modules/notification-resend/templates"

type PasswordResetEvent = {
  entity_id: string
  actor_type: string
  token: string
  metadata?: Record<string, unknown>
}

/*
 * Core signs and stores the token and emits it here; this owns the link and the
 * email around it.
 */
const TOKEN_TTL_MINUTES = 15

const storefrontUrl = () =>
  (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/+$/, "")

/**
 * Sends the reset link. A failure is logged, never thrown: the request answers
 * 201 either way, so the endpoint does not reveal which addresses have accounts.
 * Admin users are handled by the dashboard instead.
 */
export default async function passwordResetHandler({
  event,
  container,
}: SubscriberArgs<PasswordResetEvent>) {
  const { entity_id: email, actor_type, token } = event.data ?? ({} as PasswordResetEvent)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (actor_type !== "customer") {
    return
  }

  if (!email || !token) {
    logger.warn("auth.password_reset arrived without an address or token; no email sent.")
    return
  }

  try {
    const notificationService = container.resolve(Modules.NOTIFICATION)

    await notificationService.createNotifications({
      to: email,
      channel: "email",
      template: EMAIL_TEMPLATES.PASSWORD_RESET,
      data: {
        storeName: process.env.STORE_NAME || "DevCart",
        email,
        // No country code: the storefront middleware adds the region.
        resetUrl: `${storefrontUrl()}/reset-password?token=${encodeURIComponent(token)}`,
        expiresInMinutes: TOKEN_TTL_MINUTES,
      },
    })
  } catch (error) {
    logger.error(
      `Could not send the password reset email: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: AuthWorkflowEvents.PASSWORD_RESET,
}
