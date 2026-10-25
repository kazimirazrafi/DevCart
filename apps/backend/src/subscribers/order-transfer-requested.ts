import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { EMAIL_TEMPLATES } from "../modules/notification-resend/templates"

/*
 * Core Medusa only emits an event when a transfer is requested: the customer
 * nominated as the new owner has to open the emailed link before the order
 * changes hands. Neither the admin's "transfer ownership" nor the storefront's
 * transfer form sends that mail itself, so without this subscriber a request
 * sits in `requested` and the order never appears in the account.
 */

const storefrontUrl = (): string =>
  (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/+$/, "")

type TransferActionDetails = {
  token?: string
  original_email?: string
  new_email?: string
}

export default async function orderTransferRequestedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; order_change_id: string }>) {
  const orderId = event.data?.id
  const orderChangeId = event.data?.order_change_id
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!orderId || !orderChangeId) {
    logger.warn(
      "order.transfer_requested arrived without an order and change id; no transfer email sent."
    )
    return
  }

  try {
    const orderModule = container.resolve(Modules.ORDER)
    const customerModule = container.resolve(Modules.CUSTOMER)

    const change = await orderModule.retrieveOrderChange(orderChangeId, {
      relations: ["actions"],
    })

    // The token lives on the action, not the change: it is what the accept
    // route compares before the order moves.
    const action = (change.actions ?? []).find(
      (entry) => entry.action === "TRANSFER_CUSTOMER"
    )
    const details = (action?.details ?? {}) as TransferActionDetails
    const token = details.token

    if (!token || !action?.reference_id) {
      logger.warn(
        `Order change ${orderChangeId} has no transfer action with a token; no transfer email sent.`
      )
      return
    }

    const [order, customer] = await Promise.all([
      orderModule.retrieveOrder(orderId, {
        select: ["id", "display_id", "email"],
      }),
      customerModule.retrieveCustomer(action.reference_id, {
        select: ["id", "email"],
      }),
    ])

    const recipient = customer?.email

    if (!recipient) {
      logger.warn(
        `Order ${orderId} cannot be transferred by email: customer ${action.reference_id} has no address.`
      )
      return
    }

    const base = `${storefrontUrl()}/order/${orderId}/transfer/${encodeURIComponent(
      token
    )}`

    const notificationService = container.resolve(Modules.NOTIFICATION)

    await notificationService.createNotifications({
      to: recipient,
      channel: "email",
      template: EMAIL_TEMPLATES.ORDER_TRANSFER_REQUESTED,
      data: {
        storeName: process.env.STORE_NAME || "DevCart",
        orderNumber: order.display_id,
        orderId: order.id,
        recipientEmail: recipient,
        originalEmail:
          details.original_email && details.original_email !== recipient
            ? details.original_email
            : order.email ?? undefined,
        acceptUrl: `${base}/accept`,
        declineUrl: `${base}/decline`,
      },
    })
  } catch (error) {
    // A subscriber must never take the request down with it.
    logger.error(
      `Could not send the transfer email for order ${orderId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.transfer_requested",
}
