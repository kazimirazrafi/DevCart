"use server"

import { sdk } from "@lib/config"
import medusaErrorMessage from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"

import { getAuthHeaders } from "./cookies"

export type StoreReview = {
  id: string
  rating: number
  title: string | null
  body: string | null
  created_at: string
  author_name: string
}

export type ReviewSummary = {
  count: number
  average: number
  distribution: Record<string, number>
}

export type RatedProduct = {
  product_id: string
  count: number
  average: number
}

export type CatalogueReviewSummary = {
  count: number
  average: number | null
  distribution: Record<string, number>
  products: RatedProduct[]
}

export type ProductReviewsPage = {
  reviews: StoreReview[]
  count: number
  summary: ReviewSummary
}

export type ReviewActionState =
  | { ok: true; message: string }
  | { ok: false; message: string; fields?: Record<string, string> }
  | null

/**
 * Who is asking, read fresh: the data cache is keyed by url, not by the
 * Authorization header, so a cached answer would leak one customer's session to
 * the next visitor. It only runs when an auth cookie is present.
 */
export const retrieveReviewer = async (): Promise<HttpTypes.StoreCustomer | null> => {
  const headers = await getAuthHeaders()

  if (!("authorization" in headers)) {
    return null
  }

  return sdk.client
    .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
      method: "GET",
      query: { fields: "id,first_name,last_name" },
      headers,
      cache: "no-store",
    })
    .then(({ customer }) => customer)
    .catch(() => null)
}

const EMPTY: ProductReviewsPage = {
  reviews: [],
  count: 0,
  summary: { count: 0, average: 0, distribution: {} },
}

/**
 * The catalogue-wide rating picture, for the homepage. `average` is null until
 * the first review is approved, so callers show a "New" state rather than 0.0.
 */
export const getCatalogueReviewSummary =
  async (): Promise<CatalogueReviewSummary> => {
    return sdk.client
      .fetch<CatalogueReviewSummary>(`/store/reviews/summary`, {
        method: "GET",
        next: { revalidate: 300, tags: ["reviews-summary"] },
        cache: "force-cache",
      })
      .catch((error) => {
        console.error("Could not read the catalogue review summary", error)
        return { count: 0, average: null, distribution: {}, products: [] }
      })
  }

/**
 * The approved reviews of one product, newest first. Only moderated reviews come
 * back; the route decides that. A failed read returns an empty page so the
 * product page still renders.
 */
export const listProductReviews = async ({
  productId,
  limit = 10,
  offset = 0,
}: {
  productId: string
  limit?: number
  offset?: number
}): Promise<ProductReviewsPage> => {
  return sdk.client
    .fetch<ProductReviewsPage>(`/store/products/${productId}/reviews`, {
      method: "GET",
      query: { limit, offset },
      next: { revalidate: 60, tags: [`reviews-${productId}`] },
      cache: "force-cache",
    })
    .catch((error) => {
      console.error("Could not read product reviews", error)
      return EMPTY
    })
}

/**
 * Writes a review for the signed-in customer. Bound to its product id by the form
 * so it keeps useActionState's (state, formData) shape. The API enforces one
 * review per customer per product; its messages are translated here.
 */
export const createProductReview = async (
  productId: string,
  _state: ReviewActionState,
  formData: FormData
): Promise<ReviewActionState> => {
  const rating = Number(formData.get("rating"))
  const title = String(formData.get("title") ?? "").trim()
  const body = String(formData.get("body") ?? "").trim()

  const fields: Record<string, string> = {}

  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    fields.rating = "Choose a rating from 1 to 5."
  }

  if (title.length < 3) {
    fields.title = "Give your review a title of at least 3 characters."
  }

  if (body.length < 10) {
    fields.body = "Write at least 10 characters about the product."
  }

  if (Object.keys(fields).length) {
    return { ok: false, message: "Check the review and try again.", fields }
  }

  const authHeaders = await getAuthHeaders()

  if (!authHeaders) {
    return {
      ok: false,
      message: "Sign in to write a review.",
    }
  }

  try {
    await sdk.client.fetch(`/store/products/${productId}/reviews`, {
      method: "POST",
      body: { rating, title, body },
      headers: authHeaders,
      cache: "no-store",
    })
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  // No revalidateTag: a new review is pending, so the public list has not
  // changed, and refreshing here remounts the form and drops its success message.
  return {
    ok: true,
    message:
      "Thanks — your review is with us for a quick check and will appear here once it is published.",
  }
}
