import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

import { EMAIL_TEMPLATES } from "../modules/notification-resend/templates"
import { orderAccessUrl } from "../lib/order-access"

/* Only the fields the email prints; the order module owns everything else. */
type OrderForEmail = {
  id: string
  display_id: number
  email: string | null
  created_at: string
  currency_code: string
  item_total: number
  shipping_total: number
  tax_total: number
  total: number
  items?: { title: string; quantity: number; total: number }[] | null
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
}

const addressLines = (address: OrderForEmail["shipping_address"]) => {
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
 * Sends the order confirmation. The event carries an id only, so the order is
 * read back from what was committed. Every failure is logged: a subscriber must
 * not fail the order.
 */
export default async function orderPlacedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  if (!orderId) {
    logger.warn("order.placed arrived without an order id; no confirmation sent.")
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
        "created_at",
        "currency_code",
        "item_total",
        "shipping_total",
        "tax_total",
        "total",
        "items.title",
        "items.quantity",
        "items.total",
        "shipping_address.first_name",
        "shipping_address.last_name",
        "shipping_address.address_1",
        "shipping_address.address_2",
        "shipping_address.city",
        "shipping_address.postal_code",
        "shipping_address.province",
        "shipping_address.country_code",
        "shipping_methods.name",
      ],
      filters: { id: orderId },
    })

    // Only the fields declared above are used, whatever the entity type says.
    const placed = order as unknown as OrderForEmail | undefined

    if (!placed) {
      logger.warn(
        `Order ${orderId} was placed but could not be read back; no confirmation sent.`
      )
      return
    }

    if (!placed.email) {
      logger.warn(
        `Order ${orderId} has no email address; no confirmation sent.`
      )
      return
    }

    const notificationService = container.resolve(Modules.NOTIFICATION)

    await notificationService.createNotifications({
      to: placed.email,
      channel: "email",
      template: EMAIL_TEMPLATES.ORDER_CONFIRMATION,
      data: {
        storeName: process.env.STORE_NAME || "DevCart",
        orderNumber: placed.display_id,
        orderDate: placed.created_at,
        customerName:
          [placed.shipping_address?.first_name, placed.shipping_address?.last_name]
            .filter(Boolean)
            .join(" ") || undefined,
        currencyCode: placed.currency_code,
        items: (placed.items ?? []).map((item) => ({
          title: item.title,
          quantity: item.quantity,
          total: item.total,
        })),
        subtotal: placed.item_total,
        shipping: placed.shipping_total,
        tax: placed.tax_total,
        total: placed.total,
        shippingAddress: addressLines(placed.shipping_address),
        shippingMethod: placed.shipping_methods?.[0]?.name ?? null,
        orderUrl: orderAccessUrl(placed.id),
      },
    })
  } catch (error) {
    logger.error(
      `Could not send the confirmation email for order ${orderId}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
