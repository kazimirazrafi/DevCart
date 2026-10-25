"use client"

import { createProductReview, type ReviewActionState } from "@lib/data/reviews"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import { Input } from "@modules/design-system"
import { useActionState, useState } from "react"

const RATINGS = [5, 4, 3, 2, 1]

const ProductReviewForm = ({ productId }: { productId: string }) => {
  const [state, formAction] = useActionState<ReviewActionState, FormData>(
    createProductReview.bind(null, productId),
    null
  )

  const [rating, setRating] = useState(0)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")

  if (state?.ok) {
    return (
      <div
        className="flex flex-col gap-2 border border-ink p-5"
        data-testid="review-submitted"
      >
        <p className="font-display text-h3 font-bold text-ink">
          Review submitted
        </p>
        <p className="max-w-prose text-body text-ink/80">{state.message}</p>
      </div>
    )
  }

  const fieldError = (name: string) =>
    state && !state.ok ? state.fields?.[name] : undefined

  return (
    <form
      action={formAction}
      className="flex flex-col gap-5 border border-ink p-5"
      data-testid="review-form"
    >
      <div className="flex flex-col gap-1">
        <p className="font-display text-h3 font-bold text-ink">Write a review</p>
        <p className="text-small text-ink/70">
          Reviews are checked before they appear on the page.
        </p>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-small font-semibold text-ink">Rating</legend>
        <div className="flex flex-row-reverse justify-end gap-1">
          {RATINGS.map((value) => (
            <label
              key={value}
              className="group relative cursor-pointer"
              title={`${value} out of 5`}
            >
              <input
                type="radio"
                name="rating"
                value={value}
                checked={rating === value}
                onChange={() => setRating(value)}
                aria-label={`${value} out of 5 stars`}
                className="peer absolute h-full w-full cursor-pointer opacity-0"
                data-testid={`review-rating-${value}`}
              />
              <span
                aria-hidden="true"
                className={[
                  "text-h3 leading-none transition-colors",
                  value <= rating ? "text-ink" : "text-ink/20",
                  "peer-hover:text-ink peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-riso-blue",
                ].join(" ")}
              >
                ★
              </span>
            </label>
          ))}
        </div>
        {fieldError("rating") && (
          <p className="text-small text-ink">{fieldError("rating")}</p>
        )}
      </fieldset>

      <Input
        id="review-title"
        name="title"
        label="Title"
        placeholder="Sums it up in a line"
        maxLength={120}
        required
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        error={fieldError("title")}
        data-testid="review-title-input"
      />

      <div className="flex flex-col gap-2">
        <label
          htmlFor="review-body"
          className="text-small font-semibold text-ink"
        >
          Your review
        </label>
        <textarea
          id="review-body"
          name="body"
          rows={5}
          required
          maxLength={2000}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="How does it fit, feel, wear?"
          aria-invalid={fieldError("body") ? true : undefined}
          aria-describedby={
            fieldError("body") ? "review-body-error" : undefined
          }
          className={[
            "w-full rounded-square border bg-stock px-3 py-2 text-body text-ink",
            "placeholder:text-ink/70",
            fieldError("body") ? "border-riso-pink" : "border-ink",
          ].join(" ")}
          data-testid="review-body-input"
        />
        {fieldError("body") && (
          <p id="review-body-error" className="text-small text-ink">
            {fieldError("body")}
          </p>
        )}
      </div>

      {state && !state.ok && (
        <p role="alert" className="text-small text-ink" data-testid="review-error">
          {state.message}
        </p>
      )}

      <SubmitButton size="medium" data-testid="review-submit">
        Submit review
      </SubmitButton>
    </form>
  )
}

export default ProductReviewForm
