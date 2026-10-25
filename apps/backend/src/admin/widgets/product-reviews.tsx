import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { AdminProduct, DetailWidgetProps } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"

import { sdk } from "../lib/sdk"

type ReviewStatus = "pending" | "approved" | "rejected"

type AdminReview = {
  id: string
  product_id: string
  customer_id: string
  rating: number
  title: string | null
  body: string | null
  status: ReviewStatus
  created_at: string
  customer?: {
    first_name?: string | null
    last_name?: string | null
  } | null
}

type ReviewsResponse = {
  reviews: AdminReview[]
  count: number
  limit: number
  offset: number
}

const PAGE_SIZE = 5

const STATUS_COLOR: Record<ReviewStatus, "orange" | "green" | "red"> = {
  pending: "orange",
  approved: "green",
  rejected: "red",
}

const authorName = (review: AdminReview) => {
  const first = review.customer?.first_name?.trim()
  const last = review.customer?.last_name?.trim()
  const name = [first, last].filter(Boolean).join(" ")

  return name || review.customer_id
}

const Stars = ({ rating }: { rating: number }) => (
  <span
    className="text-ui-fg-base"
    aria-label={`${rating} out of 5 stars`}
    title={`${rating} out of 5`}
  >
    {"★".repeat(rating)}
    <span className="text-ui-fg-muted">{"★".repeat(5 - rating)}</span>
  </span>
)

/** Review moderation for one product. Reviews start as pending and stay off
 * the storefront until approved; rejecting keeps the row on record. */
const ProductReviewsWidget = ({ data: product }: DetailWidgetProps<AdminProduct>) => {
  const [page, setPage] = useState(0)
  const queryClient = useQueryClient()

  const queryKey = ["product-reviews", product.id, page]

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () =>
      sdk.client.fetch<ReviewsResponse>("/admin/reviews", {
        query: {
          product_id: product.id,
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        },
      }),
  })

  const moderate = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: Exclude<ReviewStatus, "pending">
    }) =>
      sdk.client.fetch(`/admin/reviews/${id}`, {
        method: "POST",
        body: { status },
      }),
    onSuccess: (_result, variables) => {
      toast.success(
        variables.status === "approved" ? "Review approved" : "Review rejected"
      )
      queryClient.invalidateQueries({ queryKey: ["product-reviews", product.id] })
    },
    onError: (mutationError: Error) => {
      toast.error(mutationError.message || "Could not update the review")
    },
  })

  const reviews = data?.reviews ?? []
  const count = data?.count ?? 0
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE))

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Reviews</Heading>
          <Text size="small" leading="compact" className="text-ui-fg-subtle">
            {count === 0
              ? "No reviews yet."
              : `${count} review${count === 1 ? "" : "s"} for this product.`}
          </Text>
        </div>
      </div>

      {isLoading && (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Loading reviews…
          </Text>
        </div>
      )}

      {isError && (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-error">
            {error instanceof Error
              ? error.message
              : "Could not load the reviews."}
          </Text>
        </div>
      )}

      {!isLoading && !isError && reviews.length === 0 && (
        <div className="px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Reviews customers write from the product page appear here for
            approval.
          </Text>
        </div>
      )}

      {reviews.map((review) => (
        <div key={review.id} className="flex flex-col gap-3 px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Stars rating={review.rating} />
                <Badge size="2xsmall" color={STATUS_COLOR[review.status]}>
                  {review.status}
                </Badge>
              </div>
              <Text size="small" weight="plus" leading="compact">
                {review.title || "(no title)"}
              </Text>
              <Text size="small" leading="compact" className="text-ui-fg-subtle">
                {authorName(review)} ·{" "}
                {new Date(review.created_at).toLocaleDateString()}
              </Text>
            </div>

            <div className="flex shrink-0 gap-2">
              {review.status !== "approved" && (
                <Button
                  size="small"
                  variant="secondary"
                  isLoading={
                    moderate.isPending && moderate.variables?.id === review.id
                  }
                  onClick={() =>
                    moderate.mutate({ id: review.id, status: "approved" })
                  }
                >
                  Approve
                </Button>
              )}
              {review.status !== "rejected" && (
                <Button
                  size="small"
                  variant="transparent"
                  isLoading={
                    moderate.isPending && moderate.variables?.id === review.id
                  }
                  onClick={() =>
                    moderate.mutate({ id: review.id, status: "rejected" })
                  }
                >
                  Reject
                </Button>
              )}
            </div>
          </div>

          {review.body && (
            <Text size="small" leading="compact" className="whitespace-pre-line text-pretty">
              {review.body}
            </Text>
          )}
        </div>
      ))}

      {pages > 1 && (
        <div className="flex items-center justify-between px-6 py-4">
          <Text size="small" className="text-ui-fg-subtle">
            Page {page + 1} of {pages}
          </Text>
          <div className="flex gap-2">
            <Button
              size="small"
              variant="secondary"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            >
              Previous
            </Button>
            <Button
              size="small"
              variant="secondary"
              disabled={page + 1 >= pages}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details",
})

export default ProductReviewsWidget
