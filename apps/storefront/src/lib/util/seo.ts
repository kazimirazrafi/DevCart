import { Metadata } from "next"

import { getBaseURL, getStoreName } from "./env"

/**
 * An absolute URL for a storefront path. Metadata is resolved with the root
 * layout's `metadataBase`, but sitemap and robots entries are plain strings, so
 * both shapes come from here rather than from two different joins.
 */
/** The store-wide share card (`app/opengraph-image.jpg`). */
export const SITE_IMAGE = "/opengraph-image.jpg"

export const absoluteUrl = (path: string) => {
  const base = getBaseURL().replace(/\/+$/, "")
  const suffix = path.startsWith("/") ? path : `/${path}`

  return `${base}${suffix}`
}

/**
 * The canonical path for a page that lives under a region: every public page is
 * rendered as `/{countryCode}/...`, so that is what a crawler should index — not
 * the country-less URL the middleware only redirects, and not the query string
 * (filters and `?v_id=` are states of the same page).
 */
export const canonicalPath = (countryCode: string, path = "") => {
  const suffix = path && !path.startsWith("/") ? `/${path}` : path

  return `/${countryCode}${suffix}`
}

type PageMetadataInput = {
  countryCode: string
  /** Path after the country code, e.g. `/products/lgtm-hoodie`. */
  path?: string
  /** Left out on the homepage so the root title template's default applies. */
  title?: string
  description?: string
  images?: string[]
  noIndex?: boolean
}

/**
 * Metadata for a page whose subject does not exist. The page still renders the
 * storefront's own not-found view, and with a route-level `loading.tsx` the
 * response has already started by the time `notFound()` is raised, so the status
 * is 200 rather than 404. `noindex` is what keeps that soft 404 out of an index
 * until the streaming shell can be reworked.
 */
export const notFoundMetadata = (): Metadata => ({
  title: "Page not found",
  robots: { index: false, follow: false },
})

/**
 * One page's metadata. `og:title` and `og:description` are deliberately not set
 * here: Next falls back to the page's own title (with the layout's template) and
 * description, which keeps the tab title and the share card from disagreeing.
 */
export const pageMetadata = ({
  countryCode,
  path = "",
  title,
  description,
  images,
  noIndex,
}: PageMetadataInput): Metadata => {
  const canonical = canonicalPath(countryCode, path)
  // The API answers `null` for a missing description but `""` for one that was
  // cleared, and an empty description is not a description.
  const summary = description?.trim() || undefined

  return {
    ...(title ? { title } : {}),
    ...(summary ? { description: summary } : {}),
    ...(noIndex ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical },
    openGraph: {
      type: "website",
      siteName: getStoreName(),
      url: absoluteUrl(canonical),
      ...(summary ? { description: summary } : {}),
      // A page's `openGraph` replaces the layout's rather than merging into it,
      // so the site-wide card has to be named here again whenever a page has no
      // picture of its own.
      images: images?.length ? images : [SITE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      ...(summary ? { description: summary } : {}),
    },
  }
}
