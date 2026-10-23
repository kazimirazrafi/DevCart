"use client"

import { HttpTypes } from "@medusajs/types"
import clsx from "clsx"
import { useParams, usePathname } from "next/navigation"

import { signout } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button } from "@modules/design-system"

type AccountLink = {
  href: string
  label: string
  "data-testid": string
}

const LINKS: AccountLink[] = [
  { href: "/account", label: "Overview", "data-testid": "overview-link" },
  { href: "/account/profile", label: "Profile", "data-testid": "profile-link" },
  {
    href: "/account/addresses",
    label: "Addresses",
    "data-testid": "addresses-link",
  },
  { href: "/account/orders", label: "Orders", "data-testid": "orders-link" },
  {
    href: "/account/wishlist",
    label: "Wishlist",
    "data-testid": "wishlist-link",
  },
]

/**
 * One nav for every width. It reads across on a phone and becomes the sidebar
 * from the `small` breakpoint, so the links never exist as two copies of
 * themselves — the starter kept a second mobile list, which is how the same
 * control ends up with the same test id twice in the document.
 */
const AccountNav = ({ customer }: { customer: HttpTypes.StoreCustomer }) => {
  const route = usePathname()
  const { countryCode } = useParams() as { countryCode: string }
  const current = route.split(`/${countryCode}`)[1] ?? ""

  const handleLogout = async () => {
    await signout(countryCode)
  }

  return (
    <nav
      aria-label="Account"
      className="flex flex-col gap-4"
      data-testid="account-nav"
    >
      <h2 className="text-small font-semibold text-ink">
        Hello {customer.first_name || "there"}
      </h2>

      <div className="flex flex-row flex-wrap gap-x-5 gap-y-1 small:flex-col small:gap-y-0">
        {LINKS.map(({ href, label, ...props }) => {
          const active = current.startsWith(href)

          return (
            <LocalizedClientLink
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "py-1 text-body transition-colors duration-150",
                active ? "font-semibold text-ink" : "text-ink/70 hover:text-ink"
              )}
              {...props}
            >
              {label}
            </LocalizedClientLink>
          )
        })}
      </div>

      <Button
        variant="secondary"
        size="small"
        onClick={handleLogout}
        className="self-start"
        data-testid="logout-button"
      >
        Log out
      </Button>
    </nav>
  )
}

export default AccountNav
