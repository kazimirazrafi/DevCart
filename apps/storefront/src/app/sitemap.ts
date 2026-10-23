import { MetadataRoute } from "next"

import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { listRegions } from "@lib/data/regions"
import { absoluteUrl } from "@lib/util/seo"

/*
 * A crawler should see one address per page, and every page the storefront
 * serves is under a region (`/{countryCode}/...`). The sitemap therefore lists
 * the default region's URLs only: the other regions render the same catalogue,
 * and listing them all would present duplicates competing for the same query.
 *
 * A product or category added in the admin appears here on the next
 * regeneration rather than on the next deploy.
 */
export const revalidate = 3600

const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"

/** Pages that exist regardless of the catalogue: the store's own documents. */
const STATIC_PAGES = [
  "/about",
  "/contact",
  "/shipping-and-delivery",
  "/returns-and-refunds",
  "/privacy-policy",
  "/terms-and-conditions",
  "/cookie-policy",
]

const lastModified = (value?: string | Date | null) => {
  if (!value) return undefined

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime()) ? undefined : date
}

const countryForSitemap = async () => {
  try {
    const regions = await listRegions()
    const countryCodes = (regions ?? [])
      .flatMap((region) => region.countries ?? [])
      .map((country) => country.iso_2)
      .filter((code): code is string => Boolean(code))

    if (countryCodes.includes(DEFAULT_REGION)) {
      return DEFAULT_REGION
    }

    return countryCodes[0] ?? DEFAULT_REGION
  } catch (error) {
    console.error("Could not read regions for the sitemap", error)
    return DEFAULT_REGION
  }
}

/** Every product, page by page: the Store API caps a page at 100. */
const allProductHandles = async (countryCode: string) => {
  const products: { handle: string; updated_at?: string | null }[] = []

  try {
    for (let page = 1; page <= 20; page++) {
      const { response, nextPage } = await listProducts({
        pageParam: page,
        countryCode,
        queryParams: { limit: 100, fields: "handle,+updated_at" },
      })

      products.push(...response.products)
      if (!nextPage) break
    }
  } catch (error) {
    // A sitemap missing products is worse than one that says so; the rest of
    // the pages still get listed.
    console.error("Could not read products for the sitemap", error)
  }

  return products
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const countryCode = await countryForSitemap()
  const prefix = `/${countryCode}`

  const [products, categories, collectionsResult] = await Promise.all([
    allProductHandles(countryCode),
    listCategories({ limit: 100, fields: "handle,+updated_at" }).catch(
      (error) => {
        console.error("Could not read categories for the sitemap", error)
        return []
      }
    ),
    listCollections({ fields: "handle,+updated_at" }).catch((error) => {
      console.error("Could not read collections for the sitemap", error)
      return { collections: [], count: 0 }
    }),
  ])

  return [
    {
      url: absoluteUrl(prefix),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl(`${prefix}/store`),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...STATIC_PAGES.map((path) => ({
      url: absoluteUrl(`${prefix}${path}`),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
    ...categories.map((category) => ({
      url: absoluteUrl(`${prefix}/categories/${category.handle}`),
      lastModified: lastModified(category.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...collectionsResult.collections.map((collection) => ({
      url: absoluteUrl(`${prefix}/collections/${collection.handle}`),
      lastModified: lastModified(collection.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...products.map((product) => ({
      url: absoluteUrl(`${prefix}/products/${product.handle}`),
      lastModified: lastModified(product.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ]
}
