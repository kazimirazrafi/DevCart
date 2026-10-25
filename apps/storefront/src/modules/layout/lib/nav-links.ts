export type NavLink = {
  label: string
  href: string
  /** Also shown in the header on wide screens. */
  primary?: boolean
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Store", href: "/store", primary: true },
  { label: "Account", href: "/account" },
  { label: "Cart", href: "/cart" },
]

export const PRIMARY_NAV_LINKS = NAV_LINKS.filter((link) => link.primary)
