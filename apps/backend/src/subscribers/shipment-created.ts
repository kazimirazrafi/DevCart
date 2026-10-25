import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { EMAIL_TEMPLATES } from "../modules/notification-resend/templates"
import { orderAccessUrl } from "../lib/order-access"

/* Only what the email prints; the rest of the order stays in the module. */
type FulfillmentForEmail = {
  id: string
  shipped_at?: string | null
  labels?: { tracking_number?: string | null; tracking_url?: string | null }[] | null
  items?:
    | {
        title?: string | null
        quantity?: number | null
        line_item_id?: string | null
      }[]
    | null
}

type OrderForShipmentEmail = {
  id: string
  display_id: number | string
  email: string | null
  shipping_address?: {
    first_name?: string | null
    last_name?: string | null
    address_1?: string | null
    address_2?: string | null
    city?: string | null
    postal_code?: string | null
    province?: string | null
    country_code?: string | null
  } | null
  shipping_methods?: { name?: string | null }[] | null
  items?:
    | { id: string; title?: string | null; variant_title?: string | null }[]
    | null
  fulfillments?: FulfillmentForEmail[] | null
}

const addressLines = (address: OrderForShipmentEmail["shipping_address"]) => {
  if (!address) {
    return []
  }

  const name = [address.first_name, address.last_name].filter(Boolean).join(" ")
  const street = [address.address_1, address.address_2].filter(Boolean).join(", ")
  const city = [address.postal_code, address.city].filter(Boolean).join(" ")

  return [name, street, city, address.country_code?.toUpperCase() ?? ""].filter(
    (line) => line !== ""
  )
}

/**
 * Sends the shipment email. The event carries a fulfillment id, so the order is
 * found through its fulfillments. Keyed on the fulfillment, so a retried event
 * does not send twice.
 */
export default async function shipmentCreatedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const fulfillmentId = event.data?.id
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!fulfillmentId) {
    logger.warn("shipment.created arrived without a fulfillment id; no shipment email sent.")
    return
  }

  if (event.data?.no_notification) {
    return
  }

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "email",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.postal_code",
        "shipping_address.province",
        "shipping_address.country_code",
        "shipping_methods.name",
        "items.id",
        "items.title",
        "items.variant_title",
        "fulfillments.id",
        "fulfillments.shipped_at",
        "fulfillments.labels.tracking_number",
        "fulfillments.labels.tracking_url",
        "fulfillments.items.title",
        "fulfillments.items.quantity",
        "fulfillments.items.line_item_id",
      ],
      // Filters on the linked fulfillment, which the generated type omits.
      filters: { fulfillments: { id: fulfillmentId } } as never,
    })

    const shipped = order as unknown as OrderForShipmentEmail | undefined

    if (!shipped) {
      logger.warn(
        `Fulfillment ${fulfillmentId} was shipped but its order could not be read back; no shipment email sent.`
      )
      return
    }

    if (!shipped.email) {
      logger.warn(
        `Order ${shipped.id} has no email address; no shipment email sent.`
      )
      return
    }

    const fulfillment = (shipped.fulfillments ?? []).find(
      (entry) => entry.id === fulfillmentId
    )

    if (!fulfillment) {
      logger.warn(
        `Order ${shipped.id} does not expose fulfillment ${fulfillmentId}; no shipment email sent.`
      )
      return
    }

    // The fulfillment item title is the variant; pair it with the order line.
    const lineItems = new Map(
      (shipped.items ?? []).map((item) => [item.id, item])
    )

    const notificationService = container.resolve(Modules.NOTIFICATION)

    await notificationService.createNotifications({
      to: shipped.email,
      channel: "email",
      template: EMAIL_TEMPLATES.SHIPMENT,
      // One email per fulfillment, however many times the event is delivered.
      idempotency_key: `shipment-created:${fulfillmentId}`,
      data: {
        storeName: process.env.STORE_NAME || "DevCart",
        orderNumber: shipped.display_id,
        shippedAt: fulfillment.shipped_at ?? null,
        customerName:
          [shipped.shipping_address?.first_name, shipped.shipping_address?.last_name]
            .filter(Boolean)
            .join(" ") || undefined,
        items: (fulfillment.items ?? []).map((item) => {
          const line = item.line_item_id
            ? lineItems.get(item.line_item_id)
            : undefined
          const title = line?.title ?? item.title ?? "Item"

          return {
            title: line?.variant_title
              ? `${title} (${line.variant_title})`
              : title,
            quantity: item.quantity ?? 1,
          }
        }),
        tracking: (fulfillment.labels ?? []).map((label) => ({
          number: label.tracking_number ?? null,
          // Only http(s): this URL is printed in an email.
          url: /^https?:\/\//i.test(label.tracking_url ?? "")
            ? label.tracking_url
            : null,
        })),
        shippingAddress: addressLines(shipped.shipping_address),
        shippingMethod: shipped.shipping_methods?.[0]?.name ?? null,
        orderUrl: orderAccessUrl(shipped.id),
      },
    })
  } catch (error) {
    logger.error(
      `Could not send the shipment email for fulfillment ${fulfillmentId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
}
