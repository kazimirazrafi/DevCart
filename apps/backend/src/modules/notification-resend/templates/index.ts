import { MedusaError } from "@medusajs/framework/utils"

import { EmailContent } from "./layout"
import { emailVerification } from "./email-verification"
import { lowStockAlert } from "./low-stock-alert"
import { newsletterWelcome } from "./newsletter-welcome"
import { orderConfirmation } from "./order-confirmation"
import { passwordReset } from "./password-reset"
import { shipment } from "./shipment"

export { EmailContent } from "./layout"
export type { EmailVerificationData } from "./email-verification"
export type { LowStockAlertData } from "./low-stock-alert"
export type { NewsletterWelcomeData } from "./newsletter-welcome"
export type { OrderConfirmationData } from "./order-confirmation"
export type { PasswordResetData } from "./password-reset"
export type { ShipmentData } from "./shipment"

/**
 * The template names the subscribers ask for. Typing them here means a names
 * mismatch is a compile error in the subscriber, not an email that silently
 * never goes out.
 */
export const EMAIL_TEMPLATES = {
  EMAIL_VERIFICATION: "email-verification",
  ORDER_CONFIRMATION: "order-confirmation",
  PASSWORD_RESET: "password-reset",
  SHIPMENT: "shipment",
  LOW_STOCK_ALERT: "low-stock-alert",
  NEWSLETTER_WELCOME: "newsletter-welcome",
} as const

export type EmailTemplateName = (typeof EMAIL_TEMPLATES)[keyof typeof EMAIL_TEMPLATES]

/**
 * Renders a notification into the subject, HTML and plain text Resend needs.
 * `data` arrives from an event and has been stored as JSON, so each template
 * narrows it defensively rather than trusting the shape.
 */
export const renderEmail = (
  template: string | null | undefined,
  data: Record<string, unknown> | null | undefined
): EmailContent => {
  const payload = (data ?? {}) as Record<string, unknown>

  switch (template) {
    case EMAIL_TEMPLATES.EMAIL_VERIFICATION:
      return emailVerification(payload as never)
    case EMAIL_TEMPLATES.ORDER_CONFIRMATION:
      return orderConfirmation(payload as never)
    case EMAIL_TEMPLATES.PASSWORD_RESET:
      return passwordReset(payload as never)
    case EMAIL_TEMPLATES.SHIPMENT:
      return shipment(payload as never)
    case EMAIL_TEMPLATES.LOW_STOCK_ALERT:
      return lowStockAlert(payload as never)
    case EMAIL_TEMPLATES.NEWSLETTER_WELCOME:
      return newsletterWelcome(payload as never)
    default:
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Unknown email template "${template ?? ""}". Known templates: ${Object.values(
          EMAIL_TEMPLATES
        ).join(", ")}.`
      )
  }
}
