import {
  createStep,
  createWorkflow,
  StepResponse,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"

import { NEWSLETTER_MODULE } from "../modules/newsletter"
import NewsletterModuleService from "../modules/newsletter/service"
import { EMAIL_TEMPLATES } from "../modules/notification-resend/templates"

export type SubscribeToNewsletterInput = {
  email: string
}

type SubscribeCompensation = {
  createdId: string | null
}

/**
 * Puts an address on the list, or recognizes that it is already there.
 *
 * The read-then-write is not atomic, so two requests for the same address can
 * both see nothing and both try to insert. The unique index is the rule, not the
 * read: the loser's insert fails, it reads the winner's row, and the visitor is
 * told they are subscribed either way. Subscribing twice is not an error.
 */
const subscribeStep = createStep(
  "subscribe",
  async (input: SubscribeToNewsletterInput, { container }) => {
    const email = input.email.trim().toLowerCase()

    if (!email) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Enter an email address."
      )
    }

    const newsletterService: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE)

    const [existing] = await newsletterService.listNewsletterSubscribers(
      { email },
      { take: 1 }
    )

    if (existing) {
      return new StepResponse(
        { subscriber: existing, created: false },
        { createdId: null } satisfies SubscribeCompensation
      )
    }

    try {
      const subscriber = await newsletterService.createNewsletterSubscribers({
        email,
      })

      return new StepResponse(
        { subscriber, created: true },
        { createdId: subscriber.id } satisfies SubscribeCompensation
      )
    } catch (error) {
      const [raced] = await newsletterService.listNewsletterSubscribers(
        { email },
        { take: 1 }
      )

      if (raced) {
        return new StepResponse(
          { subscriber: raced, created: false },
          { createdId: null } satisfies SubscribeCompensation
        )
      }

      throw error
    }
  },
  async (compensation: SubscribeCompensation | undefined, { container }) => {
    if (!compensation?.createdId) {
      return
    }

    const newsletterService: NewsletterModuleService =
      container.resolve(NEWSLETTER_MODULE)

    await newsletterService.deleteNewsletterSubscribers([compensation.createdId])
  }
)

type WelcomeInput = {
  email: string
  /** False for an address that was already on the list. */
  created: boolean
}

/**
 * The welcome email, through the notification module — which is Resend once
 * `RESEND_API_KEY` and `RESEND_FROM` are set, and the local provider otherwise.
 *
 * A failed email must not lose the subscriber: the row is already written, and
 * a provider outage at this moment is not something the visitor can act on. It
 * is logged and the signup still succeeds. A repeat signup sends nothing, so
 * subscribing twice cannot become two emails.
 */
const sendWelcomeStep = createStep(
  "send-welcome",
  async ({ email, created }: WelcomeInput, { container }) => {
    if (!created) {
      return new StepResponse(null)
    }

    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const notificationService = container.resolve(Modules.NOTIFICATION)

    try {
      await notificationService.createNotifications({
        to: email,
        channel: "email",
        template: EMAIL_TEMPLATES.NEWSLETTER_WELCOME,
        data: {
          storeName: process.env.STORE_NAME || "DevCart",
          email,
          supportEmail: process.env.SUPPORT_EMAIL || "support@kazimirazrafi.dev",
          catalogueUrl: `${(
            process.env.STOREFRONT_URL || "http://localhost:8000"
          ).replace(/\/+$/, "")}/store`,
        },
      })
    } catch (error) {
      logger.error(
        `Could not send the newsletter welcome email: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }

    return new StepResponse(null)
  }
)

export const subscribeToNewsletterWorkflow = createWorkflow(
  "subscribe-to-newsletter",
  (input: SubscribeToNewsletterInput) => {
    const subscribed = subscribeStep(input)

    sendWelcomeStep(
      transform({ input, subscribed }, (data) => ({
        email: data.input.email.trim().toLowerCase(),
        created: data.subscribed.created,
      }))
    )

    return new WorkflowResponse(subscribed)
  }
)
