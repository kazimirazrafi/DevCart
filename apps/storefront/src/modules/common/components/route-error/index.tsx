"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button, Link, Rule } from "@modules/design-system"

export type RouteErrorProps = {
  error: Error & { digest?: string }
  reset: () => void
  /** Sentence case, says what failed rather than that something did. */
  title?: string
  message?: string
  /** Where the secondary link goes. */
  homeHref?: string
  homeLabel?: string
  /**
   * `false` at the root boundary, which sits above the country segment: there
   * is no country code to prefix there, so its link is a plain one to `/` and
   * the middleware puts the region back.
   */
  localized?: boolean
}

/**
 * What a route shows when rendering it fails. Every route group has one of
 * these, so a failed read shows the storefront's own page — its chrome, its
 * type and a way forward — instead of the framework's bare error page. It is
 * deliberately not an apology: one line says what broke, the button retries the
 * render, and the digest is printed for whoever has to look it up in the logs.
 */
export default function RouteError({
  error,
  reset,
  title = "Something went wrong",
  message = "This page could not be loaded. Try again, and if it keeps failing come back in a moment.",
  homeHref = "/store",
  homeLabel = "Browse all products",
  localized = true,
}: RouteErrorProps) {
  const home = localized ? (
    <LocalizedClientLink href={homeHref} className="text-small">
      <span className="text-riso-blue underline decoration-1 underline-offset-4 hover:text-ink">
        {homeLabel}
      </span>
    </LocalizedClientLink>
  ) : (
    <Link href={homeHref} className="text-small">
      {homeLabel}
    </Link>
  )

  return (
    <div
      role="alert"
      className="content-container flex flex-col items-start gap-4 border-b border-ink/20 py-16 small:py-24"
      data-testid="route-error"
    >
      <h1 className="font-display text-display">{title}</h1>
      <Rule weight="heavy" className="my-2" />
      <p className="max-w-[72ch] text-body text-ink/80">{message}</p>

      {error.digest && (
        <p className="font-mono text-small text-ink/70" data-testid="route-error-digest">
          Reference {error.digest}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button onClick={reset} data-testid="route-error-retry">
          Try again
        </Button>
        {home}
      </div>
    </div>
  )
}
