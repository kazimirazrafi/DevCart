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
 * Rendered per request: the page reads the cache id cookie and the v_id search
 * param, and prerendering it breaks for products added after the build.
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

/* Missing region or handle returns plain metadata; the page component below
 * raises notFound(), which keeps the 404 inside this route group. */
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

  // The rating shown in search results; the same read feeds the reviews section.
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
