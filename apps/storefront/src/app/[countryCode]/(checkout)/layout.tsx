import { Metadata } from "next"

import { getStoreName } from "@lib/util/env"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// The checkout is a session-specific flow; nothing in it belongs in an index.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="relative w-full bg-stock">
      <header className="border-b border-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-3 focus:z-[60] focus:border focus:border-ink focus:bg-stock focus:px-4 focus:py-2 focus:text-small focus:font-semibold focus:text-ink"
          data-testid="skip-to-content"
        >
          Skip to content
        </a>
        <nav className="content-container flex h-16 items-center justify-between gap-4">
          <LocalizedClientLink
            href="/cart"
            className="flex items-center gap-2 text-small font-semibold text-ink hover:text-riso-blue"
            data-testid="back-to-cart-link"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden small:inline">Back to the cart</span>
            <span className="small:hidden">Back</span>
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/"
            className="font-display text-lead font-bold text-ink"
            data-testid="store-link"
          >
            {getStoreName()}
          </LocalizedClientLink>

          <span className="flex-1 basis-0" />
        </nav>
      </header>

      <main
        id="main"
        tabIndex={-1}
        className="relative"
        data-testid="checkout-container"
      >
        {children}
      </main>
    </div>
  )
}
