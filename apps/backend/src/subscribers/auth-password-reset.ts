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
 * Medusa's core already signs a single-use token and stores only its hash, then
 * emits this event with the token. Everything this store owns is the link and
 * the email around it: the token's 15-minute lifetime and its one-use rule are
 * the Auth Module's, not ours to re-implement.
 */
const TOKEN_TTL_MINUTES = 15

const storefrontUrl = () =>
  (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/+$/, "")

/**
 * Sends the password-reset link.
 *
 * The reset request is answered with `201` whatever happens here — Medusa does
 * not reveal whether an address has an account, and neither does this store. An
 * email that cannot be sent is therefore logged, never thrown: the customer is
 * told to check their inbox either way, and a real account's owner can ask
 * again.
 *
 * Admin users go through the same workflow; their reset is not this storefront's
 * page, so it is left to the admin dashboard and skipped here.
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
        // The middleware puts the region back on a URL that has none, so one
        // link works for every country the store sells to.
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
