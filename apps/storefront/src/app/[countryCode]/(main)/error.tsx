"use client"

import RouteError from "@modules/common/components/route-error"

/** Boundary for every page in this group; it renders inside the group layout,
 * so the nav and footer stay. */
export default function MainGroupError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return <RouteError error={error} reset={reset} />
}
