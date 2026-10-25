"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import React, { forwardRef } from "react"

// Keeps the current country code in front of `href`.
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
