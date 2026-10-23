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
 * The signed-in customer's saves, read live.
 *
 * `no-store` for the same reason the cart and the order reads are: this is one
 * customer's own list behind their own Authorization header, and a cached
 * entry keyed by url alone could hand one customer another's saves. A signed-out
 * visitor never reaches the API at all.
 *
 * A failed read returns an empty list rather than throwing: a product page or a
 * listing is worth showing without its hearts, and the account page says what
 * happened separately.
 */
export const listWishlist = async (): Promise<WishlistEntry[]> => {
  const headers = await getAuthHeaders()

  // `getAuthHeaders` answers an empty object for a visitor with no session, so
  // the presence of the header is the check — not the object (the same trap the
  // review form's `retrieveReviewer` avoids).
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
 * Saves a product for the signed-in customer.
 *
 * The API treats a repeat save as the same row (the heart is a toggle, and two
 * clicks can arrive out of order), so this returns whatever row holds the save
 * rather than an error the button would have to interpret.
 *
 * Failures are returned, never thrown: a thrown server-action error is masked
 * to generic copy in a production build, and the heart has to be able to say
 * "sign in first" instead.
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

/**
 * Removes one save by its row id. `404` is what an id that is not the
 * customer's looks like, and the message says the product is not saved rather
 * than that it belongs to somebody else.
 */
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
    /*
     * The route answers 204 with no body, and the SDK parses JSON whenever the
     * request says it accepts JSON — which its default does — so a successful
     * removal would arrive as "Unexpected end of JSON input" and the heart
     * would report a failure for a row that is already gone. Asking for
     * `text/plain` makes the SDK hand back the raw response instead (the same
     * shape `lib/data/password-reset.ts` handles for the reset route).
     */
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
