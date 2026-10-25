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
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
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
