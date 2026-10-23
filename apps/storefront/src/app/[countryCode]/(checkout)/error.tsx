"use client"

import RouteError from "@modules/common/components/route-error"

/**
 * The checkout's own boundary. A failed checkout load is not the moment to
 * suggest browsing the catalogue, so the way out leads back to the cart, which
 * is where everything the customer has entered still lives.
 */
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
