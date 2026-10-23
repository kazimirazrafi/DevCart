import type { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { linkProductsToSalesChannelWorkflow } from "@medusajs/medusa/core-flows"

/** Products read per query page. */
const PAGE_SIZE = 100
/** Products per link workflow run, so one call never carries the whole catalogue. */
const LINK_CHUNK_SIZE = 50
/** The channel the seed creates and the storefront's publishable key belongs to. */
const STORE_CHANNEL_NAME = "Default Sales Channel"

/**
 * Makes the storefront listing match the admin's catalogue.
 *
 * A bulk import leaves the shop disagreeing with what the admin shows, in two
 * independent ways, and the listing (`/store/search`) is what suffers:
 *
 * 1. A CSV whose `Product Sales Channel 1` column is empty creates products in
 *    no sales channel. `/store/search` narrows its hits to the publishable
 *    key's channel, so those products are published, priced and visible in the
 *    admin, and still never appear in the storefront. This attaches every such
 *    product to the store's channel.
 * 2. The index keeps whatever it was last given. Products removed by anything
 *    that did not emit `product.deleted` (a reset run against a stale process,
 *    a restored database) stay in it, so deleted products keep showing in the
 *    listing. The reindex rebuilds the index from the current catalogue, which
 *    drops them.
 *
 * Run it from `apps/backend` after an import:
 *
 * ```bash
 * pnpm run refresh-catalogue
 * ```
 *
 * Safe to re-run: products already in the channel are skipped, and a reindex
 * only replaces the index's contents with the same catalogue.
 */
export default async function refreshCatalogue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const log = (message: string) => logger.info(`[refresh-catalogue] ${message}`)

  const channel = await resolveStoreChannel(container)

  const unlinked = await findProductsWithoutChannel(query)

  if (!unlinked.length) {
    log(`every product is already in "${channel.name}"`)
  } else {
    for (let start = 0; start < unlinked.length; start += LINK_CHUNK_SIZE) {
      await linkProductsToSalesChannelWorkflow(container).run({
        input: {
          id: channel.id,
          add: unlinked.slice(start, start + LINK_CHUNK_SIZE),
          remove: [],
        },
      })
    }

    log(`added ${unlinked.length} product(s) to "${channel.name}"`)
  }

  const search = container.resolve(Modules.SEARCH)
  const { indexes } = await search.reindex({ index: "product" })

  const productIndex = (await search.listIndexes()).find(
    (index: { name: string; status?: string }) => index.name === "product"
  )

  if (productIndex?.status !== "ready") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Product search index is not ready (status: ${productIndex?.status ?? "missing"}).`
    )
  }

  log(
    `rebuilt the product search index (${indexes.join(", ")}); the storefront listing now matches the catalogue`
  )
}

/**
 * The channel the storefront sells in. The publishable key decides it at
 * request time, but that key is a storefront setting, so the channel is found
 * by the name the seed gives it — and a store with a single channel needs no
 * guessing at all. Anything else is ambiguous and should be answered by hand
 * rather than by silently picking one.
 */
async function resolveStoreChannel(container: ExecArgs["container"]) {
  const salesChannelService = container.resolve(Modules.SALES_CHANNEL)
  const channels: { id: string; name: string }[] =
    await salesChannelService.listSalesChannels({}, { take: 20 })

  const named = channels.find((channel) => channel.name === STORE_CHANNEL_NAME)

  if (named) {
    return named
  }

  if (channels.length === 1) {
    return channels[0]
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `Cannot tell which sales channel the storefront sells in (found ${channels.length}). Name it "${STORE_CHANNEL_NAME}" or leave a single channel.`
  )
}

async function findProductsWithoutChannel(
  query: Omit<RemoteQueryFunction, symbol>
): Promise<string[]> {
  const ids: string[] = []
  let skip = 0

  while (true) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "sales_channels.id"],
      pagination: { take: PAGE_SIZE, skip },
    })

    if (!products.length) {
      break
    }

    for (const product of products as {
      id: string
      sales_channels?: { id?: string }[] | null
    }[]) {
      if (!product.sales_channels?.length) {
        ids.push(product.id)
      }
    }

    skip += PAGE_SIZE
  }

  return ids
}
