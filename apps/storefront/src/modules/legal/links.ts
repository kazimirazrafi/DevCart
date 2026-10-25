/* href is the path after the country code; LocalizedClientLink adds the region. */
export type LegalLink = {
  label: string
  href: string
}

export const SUPPORT_EMAIL = "support@kazimirazrafi.dev"

/* Last reviewed date for every policy in content.ts. */
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
