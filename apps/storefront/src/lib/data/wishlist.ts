"use server"

import { sdk } from "@lib/config"
import medusaErrorMessage from "@lib/util/medusa-error"

import { getAuthHeaders } from "./cookies"

export type WishlistEntry = {
  id: string
  product_id: string
  variant_id: string | null
  created_at?: string
}

export type WishlistActionState =
  | { ok: true; entry: WishlistEntry }
  | { ok: false; message: string; requiresSignIn?: boolean }

const EMPTY: WishlistEntry[] = []

/**
 * The signed-in customer's saves, read live: the data cache is keyed by url, not
 * by the Authorization header. A failed read returns an empty list so listings
 * still render.
 */
export const listWishlist = async (): Promise<WishlistEntry[]> => {
  const headers = await getAuthHeaders()

  // getAuthHeaders answers {} without a session, so check for the header itself.
  if (!("authorization" in headers)) {
    return EMPTY
  }

  return sdk.client
    .fetch<{ items: WishlistEntry[] }>(`/store/wishlist`, {
      method: "GET",
      headers,
      cache: "no-store",
    })
    .then(({ items }) => items)
    .catch((error) => {
      console.error("Could not read the wishlist", error)
      return EMPTY
    })
}

/**
 * Saves a product for the signed-in customer. A repeat save returns the existing
 * row. Failures are returned rather than thrown, because production masks a
 * thrown server-action message.
 */
export const addToWishlist = async (
  productId: string,
  variantId?: string | null
): Promise<WishlistActionState> => {
  const headers = await getAuthHeaders()

  if (!("authorization" in headers)) {
    return {
      ok: false,
      message: "Sign in to save products to your wishlist.",
      requiresSignIn: true,
    }
  }

  try {
    const { item } = await sdk.client.fetch<{ item: WishlistEntry }>(
      `/store/wishlist`,
      {
        method: "POST",
        body: { product_id: productId, ...(variantId ? { variant_id: variantId } : {}) },
        headers,
        cache: "no-store",
      }
    )

    return { ok: true, entry: item }
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }
}

/** Removes one save by its row id. An id that is not the customer's reads as 404. */
export const removeFromWishlist = async (
  id: string
): Promise<{ ok: true } | { ok: false; message: string }> => {
  const headers = await getAuthHeaders()

  if (!("authorization" in headers)) {
    return {
      ok: false,
      message: "Sign in to manage your wishlist.",
    }
  }

  try {
    // A 204 has no body, and the SDK parses JSON by default, so a successful
    // removal would throw. Asking for text makes it return the raw response.
    await sdk.client.fetch(`/store/wishlist/${id}`, {
      method: "DELETE",
      headers: { ...headers, accept: "text/plain" },
      cache: "no-store",
    })

    return { ok: true }
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }
}
