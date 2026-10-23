import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCategoryByHandle, listCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { notFoundMetadata, pageMetadata } from "@lib/util/seo"
import CategoryTemplate from "@modules/categories/templates"

type Props = {
  params: Promise<{ category: string[]; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      sortBy?: string
      page?: string
      optionValueIds?: string | string[]
    }
  >
}

/*
 * Rendered per request rather than baked at build time: the page reads the
 * customer's cache id (through the product reads) and a category created in the
 * admin after a build has to work. Prerendering this route made every such
 * page a 500 (DYNAMIC_SERVER_USAGE), the same failure the product page had.
 */
export const dynamic = "force-dynamic"

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const productCategory = await getCategoryByHandle(params.category)

  /*
   * An unknown handle must not call `notFound()` here: a `notFound()` thrown
   * while metadata resolves renders the root `app/not-found.tsx` instead of
   * this route group's not-found page. Returning plain metadata lets the page
   * below raise it, which keeps the 404 inside the storefront layout.
   */
  if (!productCategory) {
    return notFoundMetadata()
  }

  const title = productCategory.name

  return pageMetadata({
    countryCode: params.countryCode,
    path: `/categories/${params.category.join("/")}`,
    title,
    description:
      productCategory.description?.trim() ||
      `${title} from DevCart: a full department store, shipped in small runs.`,
  })
}

export default async function CategoryPage(props: Props) {
  const params = await props.params

  const [productCategory, categories, region] = await Promise.all([
    getCategoryByHandle(params.category),
    listCategories(),
    getRegion(params.countryCode),
  ])

  if (!productCategory || !region) {
    notFound()
  }

  return (
    <CategoryTemplate
      category={productCategory}
      categories={categories}
      currencyCode={region.currency_code}
      countryCode={params.countryCode}
    />
  )
}
