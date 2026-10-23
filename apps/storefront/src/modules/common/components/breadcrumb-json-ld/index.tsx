import { absoluteUrl } from "@lib/util/seo"

export type Breadcrumb = {
  name: string
  /** Path after the country code, e.g. `/categories/shirts`. Empty is home. */
  path: string
}

/**
 * schema.org `BreadcrumbList` for the trail a page already draws.
 *
 * Google replaces a result's URL line with this trail, so it has to say exactly
 * what the page says — same names, same order, and the ancestors the page's own
 * breadcrumb shows. Every `item` is absolute because a crawler resolves these
 * against the whole web, not against this document.
 */
export default function BreadcrumbJsonLd({
  countryCode,
  items,
}: {
  countryCode: string
  items: Breadcrumb[]
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path ? `/${countryCode}${item.path}` : `/${countryCode}`),
    })),
  }

  return (
    <script
      type="application/ld+json"
      // `<` is escaped so a product or category name can never close the
      // element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
