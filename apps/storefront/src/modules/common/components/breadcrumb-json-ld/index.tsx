import { absoluteUrl } from "@lib/util/seo"

export type Breadcrumb = {
  name: string
  /** Path after the country code, e.g. `/categories/shirts`. Empty is home. */
  path: string
}

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
      // Escaped so a name can never close the script element.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
