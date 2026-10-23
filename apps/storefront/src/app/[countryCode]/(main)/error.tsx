"use client"

import RouteError from "@modules/common/components/route-error"

/**
 * The error boundary for everything in the storefront: home, store, product,
 * category, collection, cart, order and account. It renders inside the group's
 * layout, so the customer keeps the nav and footer and can walk away from the
 * broken page rather than staring at a framework error.
 */
export default function MainGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError error={error} reset={reset} />
}
