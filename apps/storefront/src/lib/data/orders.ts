"use server"

import { sdk } from "@lib/config"
import medusaErrorMessage from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders } from "./cookies"

/*
 * Orders are per-customer and the data cache is keyed by url, not by the
 * Authorization header, so these reads use no-store, like the cart.
 */

/**
 * The order with this id, or null when the Store API will not return it: missing,
 * not the signed-in customer's, or a guest's without the confirmation token.
 * The token travels as a header so it stays out of access logs; the backend
 * middleware decides who may read the order.
 */
export const retrieveOrder = async (
  id: string,
  accessToken?: string
): Promise<HttpTypes.StoreOrder | null> => {
  const headers = {
    ...(await getAuthHeaders()),
    ...(accessToken ? { "x-order-access-token": accessToken } : {}),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
      method: "GET",
      query: {
        // Allowed extras, not defaults: the account page needs the statuses and
        // customer_id for its ownership check.
        fields:
          "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product,+fulfillment_status,+payment_status,+customer_id",
      },
      headers,
      cache: "no-store",
    })
    .then(({ order }) => order)
    .catch((error) => {
      medusaErrorMessage(error)
      return null
    })
}

export type OrderListResult =
  | { ok: true; orders: HttpTypes.StoreOrder[]; count: number }
  | { ok: false; message: string }

/** The signed-in customer's own orders, newest first; the API filters by auth context. */
export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, unknown>
): Promise<OrderListResult> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
        // The list's defaults omit the statuses, so they are requested.
        fields:
          "*items,+items.metadata,*items.variant,*items.product,+fulfillment_status,+payment_status",
        ...filters,
      },
      headers,
      cache: "no-store",
    })
    .then(({ orders, count }) => ({
      ok: true as const,
      orders,
      count: count ?? orders.length,
    }))
    .catch((error) => ({
      ok: false as const,
      // Returned, not thrown: production masks a thrown server-action message.
      message: medusaErrorMessage(error),
    }))
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const submitted = (formData.get("order_id") as string)?.trim() ?? ""

  if (!submitted) {
    return { success: false, error: "Order ID is required", order: null }
  }

  // A pasted confirmation link is the common mistake, so the id is read out of
  // it instead of failing on a 404 the customer cannot interpret.
  const orderId = submitted.match(/(order_[A-Z0-9]+)/i)?.[1] ?? submitted

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      orderId,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({
      success: false,
      error: transferErrorMessage(err.message, orderId),
      order: null,
    }))
}

/**
 * Core Medusa allows one open order change at a time, so a second request is
 * refused with wording that means nothing to a customer. These are the cases
 * worth naming; everything else is passed through.
 */
const transferErrorMessage = (message: string, orderId: string): string => {
  if (/existing active order change/i.test(message)) {
    return `Order ${orderId} already has a transfer waiting. Open the link we emailed you, or ask the store to cancel it and try again.`
  }

  if (/to a guest customer account/i.test(message)) {
    return "That order belongs to a guest checkout, and this account cannot receive it yet. Contact the store so they can move it to you."
  }

  if (/already belongs to customer/i.test(message)) {
    return `Order ${orderId} is already in this account. It should appear under Account → Orders.`
  }

  if (/not found|does not exist/i.test(message)) {
    return `We could not find an order with the id ${orderId}. Use the reference from your confirmation email, which looks like order_01H8XYZ.`
  }

  return message
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}
