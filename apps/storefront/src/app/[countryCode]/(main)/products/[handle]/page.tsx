import { Metadata } from "next"
import { notFound } from "next/navigation"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { listProductReviews } from "@lib/data/reviews"
import { notFoundMetadata, pageMetadata } from "@lib/util/seo"
import ProductTemplate from "@modules/products/templates"
import { HttpTypes } from "@medusajs/types"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
  searchParams: Promise<{ v_id?: string }>
}

/*
 * Rendered per request rather than baked at build time.
 *
 * This page reads the customer's cache id (through the product reads) and the
 * `v_id` search param, so it is dynamic by nature. Prerendering it anyway —
 * the `generateStaticParams` this page used to carry — only baked the products
 * that existed at build time and answered every product added since (an import,
 * a product created in the admin) with a 500: the static route hit a dynamic
 * API and Next raised DYNAMIC_SERVER_USAGE. The reads themselves stay cached, so
 * a repeat view does not re-fetch the catalogue.
 */
export const dynamic = "force-dynamic"

function getImagesForVariant(
  product: HttpTypes.StoreProduct,
  selectedVariantId?: string
) {
  if (!selectedVariantId || !product.variants) {
    return product.images
  }

  const variant = product.variants!.find((v) => v.id === selectedVariantId)
  if (!variant || !variant.images?.length) {
    return product.images
  }

  const imageIdsMap = new Map(variant.images!.map((i) => [i.id, true]))
  return product.images?.filter((i) => imageIdsMap.has(i.id)) ?? null
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { handle } = params
  const region = await getRegion(params.countryCode)

/*
 * Missing region or handle returns plain metadata rather than calling
   * `notFound()`: a `notFound()` raised while metadata resolves bypasses this
   * route group's not-found page and renders the root one. The page component
   * below raises it instead.
   */
  if (!region) {
    return notFoundMetadata()
  }

  const product = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle },
  }).then(({ response }) => response.products[0])

  if (!product) {
    return notFoundMetadata()
  }

  const image = product.thumbnail ?? product.images?.[0]?.url

  // The root layout template appends the store name to the title.
  return pageMetadata({
    countryCode: params.countryCode,
    path: `/products/${product.handle}`,
    title: product.title ?? handle,
    description: product.description ?? product.title ?? "",
    images: image ? [image] : undefined,
  })
}

export default async function ProductPage(props: Props) {
  const params = await props.params
  const region = await getRegion(params.countryCode)
  const searchParams = await props.searchParams

  const selectedVariantId = searchParams.v_id

  if (!region) {
    notFound()
  }

  const pricedProduct = await listProducts({
    countryCode: params.countryCode,
    queryParams: { handle: params.handle },
  }).then(({ response }) => response.products[0])

  if (!pricedProduct) {
    notFound()
  }

  const images = getImagesForVariant(pricedProduct, selectedVariantId)

  /*
   * The rating a search result shows. The same read feeds the reviews section,
   * and both are cached for a minute, so an approval in the admin reaches the
   * product's structured data without a deploy.
   */
  const { summary } = await listProductReviews({
    productId: pricedProduct.id,
    limit: 1,
  })

  return (
    <ProductTemplate
      product={pricedProduct}
      region={region}
      countryCode={params.countryCode}
      images={images ?? []}
      reviewSummary={summary}
    />
  )
}
