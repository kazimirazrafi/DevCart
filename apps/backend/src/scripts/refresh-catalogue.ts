import type { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { linkProductsToSalesChannelWorkflow } from "@medusajs/medusa/core-flows"

/** Products read per page. */
const PAGE_SIZE = 100
/** Products per link run. */
const LINK_CHUNK_SIZE = 50
/** Channel the seed creates and the publishable key belongs to. */
const STORE_CHANNEL_NAME = "Default Sales Channel"

/**
 * Points the storefront listing at the admin's catalogue: imported products
 * with no sales channel are linked to the store's, then the search index is
 * rebuilt so deleted products stop showing.
 *
 * Run from apps/backend: pnpm run refresh-catalogue
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

/** The storefront's channel, by the name the seed gives it. A store with one
 * channel needs no guessing; more than one is an error. */
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
