"use server"

import { CATALOGUE_REVALIDATE_SECONDS, sdk } from "@lib/config"
import { OptionValueIds } from "@lib/util/product-option-filters"
import { sortProducts } from "@lib/util/sort-products"
import { remainingUnits } from "@lib/util/stock"
import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"

type ProductListQueryParams = (HttpTypes.FindParams &
  HttpTypes.StoreProductListParams) & {
  options?: string[]
  option_value_id?: string | string[]
}

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
  cache = "force-cache",
}: {
  pageParam?: number
  queryParams?: ProductListQueryParams
  countryCode?: string
  regionId?: string
  /** `no-store` for reads that must not lag a stock change. */
  cache?: RequestCache
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
    revalidate: CATALOGUE_REVALIDATE_SECONDS,
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          // *categories saves the related-products rail a second read.
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+metadata,+tags,*categories,",
          ...queryParams,
        },
        headers,
        ...(cache === "force-cache" ? { next } : {}),
        cache,
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

/**
 * Units still buyable per variant id, null where stock is not a limit. Cart lines
 * carry no inventory, so callers read it here; a failed read returns {}.
 */
export const listVariantAvailability = async ({
  productIds,
  countryCode,
  regionId,
}: {
  productIds: string[]
  countryCode?: string
  regionId?: string
}): Promise<Record<string, number | null>> => {
  const ids = Array.from(new Set(productIds.filter(Boolean)))

  if (!ids.length) {
    return {}
  }

  try {
    const { response } = await listProducts({
      queryParams: { id: ids, limit: 100 },
      countryCode,
      regionId,
      // Live: a cached level can already be behind the catalogue.
      cache: "no-store",
    })

    return response.products.reduce<Record<string, number | null>>(
      (availability, product) => {
        for (const variant of product.variants ?? []) {
          availability[variant.id] = remainingUnits(variant)
        }

        return availability
      },
      {}
    )
  } catch (error) {
    console.error("Could not read variant availability", error)
    return {}
  }
}

/** How many candidates one source may offer before the next source is asked. */
const RELATED_CANDIDATES = 12

/**
 * The products beside one product: its category first, then its collection, then
 * the rest of the catalogue. The reads are separate because the Store API ANDs
 * filters, so asking for both at once would only match products in both.
 */
export const listRelatedProducts = async ({
  product,
  countryCode,
  limit = 4,
}: {
  product: HttpTypes.StoreProduct
  countryCode: string
  limit?: number
}): Promise<HttpTypes.StoreProduct[]> => {
  const categoryIds = (product.categories ?? [])
    .map((category) => category.id)
    .filter((id): id is string => Boolean(id))

  const sources: ProductListQueryParams[] = []

  if (categoryIds.length) {
    sources.push({ category_id: categoryIds, limit: RELATED_CANDIDATES })
  }

  if (product.collection_id) {
    sources.push({
      collection_id: [product.collection_id],
      limit: RELATED_CANDIDATES,
    })
  }

  sources.push({ limit: RELATED_CANDIDATES })

  const related: HttpTypes.StoreProduct[] = []
  const seen = new Set<string>([product.id])

  for (const queryParams of sources) {
    if (related.length >= limit) break

    const { response } = await listProducts({
      queryParams: { ...queryParams, is_giftcard: false },
      countryCode,
    })

    for (const candidate of response.products) {
      if (seen.has(candidate.id)) continue

      seen.add(candidate.id)
      related.push(candidate)

      if (related.length >= limit) break
    }
  }

  return related
}

export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
  optionValueIds,
}: {
  page?: number
  queryParams?: ProductListQueryParams
  sortBy?: SortOptions
  countryCode: string
  optionValueIds?: OptionValueIds
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  const limit = queryParams?.limit || 12
  const optionFilters = Array.from(
    new Set((optionValueIds || []).filter(Boolean))
  )

  const {
    response: { products },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      ...(optionFilters.length ? { option_value_id: optionFilters } : {}),
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)

  const pageParam = (page - 1) * limit

  const filteredCount = products.length

  const nextPage = filteredCount > pageParam + limit ? pageParam + limit : null

  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count: filteredCount,
    },
    nextPage,
    queryParams,
  }
}
