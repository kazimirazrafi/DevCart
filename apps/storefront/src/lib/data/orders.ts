"use server"

import { sdk } from "@lib/config"
import medusaErrorMessage from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { getAuthHeaders } from "./cookies"

/*
 * Orders are per-customer, so these reads never go through the data cache.
 * `/store/orders` has the same URL for every customer — only the Authorization
 * header differs — so a cached response hands one customer the previous one's
 * orders, and either read would keep showing a customer an order an admin has
 * just shipped. They read with `no-store`, like the cart.
 */

/**
 * The order with this id, or null when the Store API will not return it: an id
 * that does not exist, one that is not the signed-in customer's, or a guest's
 * order read without the token from its confirmation link. The routes answer a
 * null with the storefront's 404 rather than an error, so the message is
 * logged rather than thrown.
 *
 * `accessToken` comes from the confirmation URL and is sent as a header rather
 * than repeated in the query string, so it stays out of the backend's access
 * logs. The backend's middleware is what actually decides: the signed-in owner
 * or a valid token, and a not-found for everything else.
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
        /*
         * `customer_id`, `fulfillment_status` and `payment_status` are allowed
         * extras on this route but not part of its defaults, and the account's
         * page needs all three: without `customer_id` the ownership check on
         * the order's own page cannot tell whose order this is, and without the
         * statuses the receipt reads "Unknown" for delivery and payment.
         */
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

/**
 * The signed-in customer's own orders, newest first. The Store API filters the
 * list by the authenticated customer server-side (its route takes `customer_id`
 * from the auth context), so this can only ever return the caller's.
 */
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
        // `list` and `retrieve` allow different field sets: the statuses are
        // extras on both, and are asked for explicitly because the list's
        // defaults are only id/display_id/total/currency/created_at.
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
      // Returned, not thrown: a production build masks a thrown server-action
      // message ("An error occurred in the Server Components render"), which is
      // how a failed order read used to reach the customer (K2's class of bug).
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
