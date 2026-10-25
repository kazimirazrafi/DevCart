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

/* Built per request: the page reads the cache id cookie, and a category created
 * after a build has to work. */
export const dynamic = "force-dynamic"

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const productCategory = await getCategoryByHandle(params.category)

  // notFound() raised while metadata resolves renders the root not-found page,
  // so the page below raises it instead.
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
