"use client"

import RouteError from "@modules/common/components/route-error"

/**
 * The last boundary before Next's own: it catches failures in the layouts the
 * group boundaries sit inside, so there is no nav, footer or country code here.
 */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-screen flex-col justify-center bg-stock"
    >
      <RouteError
        error={error}
        reset={reset}
        title="The store is unavailable"
        message="This page could not be loaded. Try again, and if it keeps failing come back in a moment."
        homeHref="/"
        homeLabel="Go to the homepage"
        localized={false}
      />
    </main>
  )
}
