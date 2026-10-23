import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle } from "@lib/data/collections"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { parseOptionValueIds } from "@lib/util/product-option-filters"
import { notFoundMetadata, pageMetadata } from "@lib/util/seo"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<
    Record<string, string | string[] | undefined> & {
      page?: string
      sortBy?: SortOptions
      optionValueIds?: string | string[]
    }
  >
}

export const PRODUCT_LIMIT = 12

/*
 * Rendered per request rather than baked at build time: the page reads the
 * `sortBy`/`page` search params and the customer's cache id (through the
 * product reads), and a collection created after a build has to work.
 * Prerendering this route made every such page a 500 (DYNAMIC_SERVER_USAGE),
 * the same failure the product page had.
 */
export const dynamic = "force-dynamic"

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const collection = await getCollectionByHandle(params.handle)

  /*
   * An unknown handle must not call `notFound()` here: a `notFound()` thrown
   * while metadata resolves renders the root `app/not-found.tsx` instead of
   * this route group's not-found page. Returning plain metadata lets the page
   * below raise it, which keeps the 404 inside the storefront layout.
   */
  if (!collection) {
    return notFoundMetadata()
  }

  return pageMetadata({
    countryCode: params.countryCode,
    path: `/collections/${params.handle}`,
    title: collection.title,
    description: `The ${collection.title} collection from DevCart.`,
  })
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams
  const optionValueIds = parseOptionValueIds(searchParams)

  const collection = await getCollectionByHandle(params.handle).then(
    (collection) => collection
  )

  if (!collection) {
    notFound()
  }

  return (
    <CollectionTemplate
      collection={collection}
      page={page}
      sortBy={sortBy}
      countryCode={params.countryCode}
      optionValueIds={optionValueIds}
    />
  )
}
