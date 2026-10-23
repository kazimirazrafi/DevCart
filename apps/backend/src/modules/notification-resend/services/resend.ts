import {
  AbstractNotificationProviderService,
  MedusaError,
} from "@medusajs/framework/utils"
import type {
  Logger,
  ProviderSendNotificationDTO,
  ProviderSendNotificationResultsDTO,
} from "@medusajs/framework/types"

import { renderEmail } from "../templates"

export type ResendOptions = {
  apiKey: string
  /** A verified sender, e.g. `DevCart <orders@example.com>`. */
  from: string
  /** Channels this provider answers for; the notification module reads it. */
  channels: string[]
  /** Resend's API root. Overridable so a local stub can stand in for it. */
  baseUrl?: string
  storeName?: string
}

type ResendResponse = {
  id?: string
  message?: string
  name?: string
}

const DEFAULT_BASE_URL = "https://api.resend.com"
const REQUEST_TIMEOUT_MS = 10_000

/**
 * Sends this store's email through Resend's HTTP API.
 *
 * There is no SDK dependency: the whole integration is one POST, and the
 * template rendering that would otherwise live in Resend's hosted templates
 * lives in `../templates` where it is versioned with the code that fills it.
 *
 * Failures are thrown, not swallowed — the notification module stores the
 * notification and the order-placed subscriber is what decides that a failed
 * email must not fail the order.
 */
export class ResendNotificationService extends AbstractNotificationProviderService {
  static identifier = "resend"

  protected logger_: Logger
  protected options_: ResendOptions & { baseUrl: string; storeName: string }

  constructor({ logger }: { logger: Logger }, options: ResendOptions) {
    super()

    this.logger_ = logger
    this.options_ = {
      ...options,
      baseUrl: (options.baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, ""),
      storeName: options.storeName || "DevCart",
    }
  }

  static validateOptions(options: Record<string, unknown>) {
    if (!options.apiKey) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend requires an API key in the provider options."
      )
    }

    if (!options.from) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Resend requires a verified sender in the provider options."
      )
    }
  }

  async send(
    notification: ProviderSendNotificationDTO
  ): Promise<ProviderSendNotificationResultsDTO> {
    if (!notification) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "No notification information provided"
      )
    }

    if (notification.channel !== "email") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Resend only sends email; received the "${notification.channel}" channel.`
      )
    }

    const to = notification.to?.trim()

    if (!to) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "A notification needs a recipient address."
      )
    }

    const { subject, html, text } = renderEmail(
      notification.template,
      notification.data
    )

    const response = await fetch(`${this.options_.baseUrl}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: notification.from?.trim() || this.options_.from,
        to: [to],
        subject,
        html,
        text,
      }),
      // A provider that hangs would hold the subscriber open indefinitely.
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch((error: unknown) => {
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Could not reach Resend: ${error instanceof Error ? error.message : String(error)}`
      )
    })

    const body = (await response.json().catch(() => null)) as ResendResponse | null

    if (!response.ok) {
      /*
       * The response body explains the rejection (an unverified sender, a bad
       * key, a malformed address). It is logged because it is the only place
       * that reason exists; the recipient is not, because it is personal data.
       */
      this.logger_.error(
        `Resend rejected the "${notification.template}" email: ${response.status} ${
          body?.message ?? body?.name ?? "no reason given"
        }`
      )

      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend rejected the email with status ${response.status}.`
      )
    }

    this.logger_.info(
      `Sent the "${notification.template}" email through Resend${
        body?.id ? ` (${body.id})` : ""
      }.`
    )

    return { id: body?.id }
  }
}

export default ResendNotificationService
