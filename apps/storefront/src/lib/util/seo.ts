import { Metadata } from "next"

import { getBaseURL, getStoreName } from "./env"

/** The store-wide share card (app/opengraph-image.jpg). */
export const SITE_IMAGE = "/opengraph-image.jpg"

/** Absolute URL for a path; sitemap and robots entries are plain strings. */
export const absoluteUrl = (path: string) => {
  const base = getBaseURL().replace(/\/+$/, "")
  const suffix = path.startsWith("/") ? path : `/${path}`

  return `${base}${suffix}`
}

/** Public pages are indexed under /{countryCode}; filters and query strings are
 * states of the same page. */
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
 * Metadata for a missing page. A route-level loading.tsx means the response has
 * already started when notFound() runs, so the status is 200; noindex keeps that
 * soft 404 out of search results.
 */
export const notFoundMetadata = (): Metadata => ({
  title: "Page not found",
  robots: { index: false, follow: false },
})

/**
 * One page's metadata. og:title and og:description are left out so Next falls
 * back to the page's own title and description.
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
  // The API returns null for a missing description and "" for a cleared one.
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
      // openGraph replaces the layout's object, so the site card must be repeated.
      images: images?.length ? images : [SITE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      ...(summary ? { description: summary } : {}),
    },
  }
}
