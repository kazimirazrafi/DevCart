"use client"

import RouteError from "@modules/common/components/route-error"

/**
 * The last boundary before Next's own. It catches what the group boundaries
 * cannot: a failure in the layouts they sit inside (the nav's own reads, for
 * one), which unmounts those layouts — hence no nav or footer, and no country
 * code to build a link from. It still renders inside the root layout, so the
 * fonts and the design tokens are there.
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
