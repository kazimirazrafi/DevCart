"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React, { forwardRef } from "react"

/**
 * Use this component to create a Next.js `<Link />` that persists the current country code in the url,
 * without having to explicitly pass it as a prop.
 *
 * The ref is forwarded to the anchor so the link can stand in as a headless UI
 * trigger (`PopoverButton as={LocalizedClientLink}`), which needs to hold a ref
 * to manage focus.
 */
type LocalizedClientLinkProps = Omit<
  React.ComponentPropsWithoutRef<typeof Link>,
  "href"
> & { href: string }

const LocalizedClientLink = forwardRef<
  HTMLAnchorElement,
  LocalizedClientLinkProps
>(({ children, href, ...props }, ref) => {
  const { countryCode } = useParams()

  return (
    <Link ref={ref} href={`/${countryCode}${href}`} {...props}>
      {children}
    </Link>
  )
})

LocalizedClientLink.displayName = "LocalizedClientLink"

export default LocalizedClientLink
