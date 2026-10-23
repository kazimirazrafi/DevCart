/**
 * The store's legal and support destinations, in one list.
 *
 * The pages' own footer navigation, the policy sidebar and the storefront
 * footer all read this, so a policy cannot exist without a way to reach it.
 * `href` is the path after the country code; every link is rendered through
 * `LocalizedClientLink`, which adds the region.
 */
export type LegalLink = {
  label: string
  href: string
}

export const SUPPORT_EMAIL = "support@kazimirazrafi.dev"

/** The date every policy in `content.ts` was last reviewed. */
export const LEGAL_UPDATED = "23 October 2026"

export const LEGAL_LINKS: LegalLink[] = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Shipping & delivery", href: "/shipping-and-delivery" },
  { label: "Returns & refunds", href: "/returns-and-refunds" },
  { label: "Privacy policy", href: "/privacy-policy" },
  { label: "Terms & conditions", href: "/terms-and-conditions" },
  { label: "Cookie policy", href: "/cookie-policy" },
]
