import { Metadata } from "next"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Rule, linkClass } from "@modules/design-system"

export const metadata: Metadata = {
  title: "Page not found",
  description: "This page does not exist",
}

export default function NotFound() {
  return (
    <div
      className="content-container flex flex-col items-start gap-4 border-b border-ink/20 py-16 small:py-24"
      data-testid="not-found"
    >
      <h1 className="font-display text-display">Page not found</h1>
      <Rule weight="heavy" className="my-2" />
      <p className="max-w-[72ch] text-body text-ink/80">
        The page you tried to open does not exist. It may have been renamed, or
        the link that brought you here may be out of date.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3">
        <LocalizedClientLink href="/store" className={linkClass}>
          Browse all products
        </LocalizedClientLink>
        <LocalizedClientLink href="/" className={linkClass}>
          Go to the homepage
        </LocalizedClientLink>
      </div>
    </div>
  )
}
