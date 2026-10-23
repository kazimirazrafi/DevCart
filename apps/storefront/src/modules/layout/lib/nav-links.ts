/**
 * The storefront's destinations, in one place.
 *
 * The header and the menu panel read the same list, so a link cannot exist in
 * one and be missing from the other: `primary` only decides whether a link is
 * also offered in the header on a wide screen. The panel always carries all of
 * them, which is where the navigation grows — a new destination is one entry
 * here and it appears in both places.
 *
 * Account and Cart are in the list for the panel's sake; in the header they are
 * icons beside the search, not words.
 */
export type NavLink = {
  label: string
  href: string
  /** Also shown in the header itself, at `small` and up. */
  primary?: boolean
}

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Store", href: "/store", primary: true },
  { label: "Account", href: "/account" },
  { label: "Cart", href: "/cart" },
]

export const PRIMARY_NAV_LINKS = NAV_LINKS.filter((link) => link.primary)
