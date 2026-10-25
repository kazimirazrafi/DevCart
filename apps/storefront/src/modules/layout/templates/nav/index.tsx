import { Suspense } from "react"
import { User } from "@medusajs/icons"

import { listLocales } from "@lib/data/locales"
import { getStoreName } from "@lib/util/env"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import Search from "@modules/layout/components/search"
import SideMenu from "@modules/layout/components/side-menu"
import ThemeSwitcher from "@modules/layout/components/theme-switcher"
import { PRIMARY_NAV_LINKS } from "@modules/layout/lib/nav-links"

export default async function Nav() {
  const [regions, locales, currentLocale] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
  ])

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <header className="relative h-16 mx-auto border-b duration-200 bg-stock border-ink/20">
        {/* First in the tab order, so the nav can be skipped from the keyboard. */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-6 focus:top-3 focus:z-[60] focus:border focus:border-ink focus:bg-stock focus:px-4 focus:py-2 focus:text-small focus:font-semibold focus:text-ink"
          data-testid="skip-to-content"
        >
          Skip to content
        </a>
        <nav className="content-container txt-xsmall-plus text-ink/70 flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center gap-x-6">
            <div className="h-full">
              <SideMenu regions={regions} locales={locales} currentLocale={currentLocale} />
            </div>

            <ul className="hidden small:flex items-center gap-x-6">
              {PRIMARY_NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <LocalizedClientLink
                    className="hover:text-ink"
                    href={link.href}
                    data-testid={`nav-primary-${link.label.toLowerCase()}`}
                  >
                    {link.label}
                  </LocalizedClientLink>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus hover:text-ink uppercase"
              data-testid="nav-store-link"
            >
              {getStoreName()}
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-5 small:gap-x-6 h-full flex-1 basis-0 justify-end">
            <Search />

            <ThemeSwitcher
              variant="compact"
              testIdPrefix="theme-header"
              className="hidden small:flex"
            />

            <LocalizedClientLink
              className="flex h-full items-center px-1 hover:text-ink"
              href="/account"
              aria-label="Account"
              data-testid="nav-account-link"
            >
              <User aria-hidden="true" className="h-5 w-5" />
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-ink flex gap-2"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
