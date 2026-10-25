"use client"

import RouteError from "@modules/common/components/route-error"

/** The way out leads back to the cart, where the customer's details still live. */
export default function CheckoutGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="The checkout could not be loaded"
      message="Your cart and its details are safe. Try again, and if it keeps failing come back in a moment."
      homeHref="/cart"
      homeLabel="Back to the cart"
    />
  )
}
