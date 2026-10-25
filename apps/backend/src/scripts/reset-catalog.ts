import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  deleteCollectionsWorkflow,
  deleteInventoryItemWorkflow,
  deletePriceListsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductOptionsWorkflow,
  deleteProductTagsWorkflow,
  deleteProductTypesWorkflow,
  deleteProductsWorkflow,
  deleteReservationsWorkflow,
} from "@medusajs/medusa/core-flows"

type StockAlertService = {
  listStockAlerts: (filters: object) => Promise<{ id: string }[]>
  deleteStockAlerts: (ids: string[]) => Promise<unknown>
}

/**
 * Empties the catalogue: products, options, categories, collections, tags,
 * types, price lists, leftover inventory items and their stock alerts.
 * Keeps the store, regions, channel, location, customers and orders.
 *
 * Run from apps/backend: pnpm run reset-catalog
 */
export default async function resetCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const log = (message: string) => logger.info(`[reset-catalog] ${message}`)

  // Products ----------------------------------------------------------------
  // Batched so the work does not sit in one transaction over the whole
  // catalogue, and one bad batch cannot hold up the rest.
  let productCount = 0
  while (true) {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id"],
      pagination: { take: 50, skip: 0 },
    })

    if (!products.length) {
      break
    }

    const ids = products.map((product) => product.id)
    await deleteProductsWorkflow(container).run({ input: { ids } })
    productCount += ids.length
    log(`deleted ${productCount} products`)
  }

  // Shared options (Size, Color, ...) are not owned by a product, so they are
  // still there once the products are gone.
  const { data: options } = await query.graph({
    entity: "product_option",
    fields: ["id"],
  })
  if (options.length) {
    await deleteProductOptionsWorkflow(container).run({
      input: { ids: options.map((option) => option.id) },
    })
    log(`deleted ${options.length} product options`)
  }

  // Categories --------------------------------------------------------------
  // A parent cannot be deleted in the same call as its children, so the tree is
  // removed one depth level at a time, deepest first.
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "parent_category_id"],
  })
  const parents = new Map(
    categories.map((category) => [category.id, category.parent_category_id ?? null])
  )
  const depthOf = (id: string): number => {
    let depth = 0
    let current: string | null = parents.get(id) ?? null
    while (current) {
      depth += 1
      current = parents.get(current) ?? null
    }
    return depth
  }
  const idsByDepth = new Map<number, string[]>()
  for (const category of categories) {
    const depth = depthOf(category.id)
    idsByDepth.set(depth, [...(idsByDepth.get(depth) ?? []), category.id])
  }
  for (const depth of [...idsByDepth.keys()].sort((a, b) => b - a)) {
    await deleteProductCategoriesWorkflow(container).run({
      input: idsByDepth.get(depth)!,
    })
  }
  if (categories.length) {
    log(`deleted ${categories.length} categories`)
  }

  // Collections, tags, types and price lists --------------------------------
  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id"],
  })
  if (collections.length) {
    await deleteCollectionsWorkflow(container).run({
      input: { ids: collections.map((collection) => collection.id) },
    })
    log(`deleted ${collections.length} collections`)
  }

  const { data: tags } = await query.graph({
    entity: "product_tag",
    fields: ["id"],
  })
  if (tags.length) {
    await deleteProductTagsWorkflow(container).run({
      input: { ids: tags.map((tag) => tag.id) },
    })
    log(`deleted ${tags.length} tags`)
  }

  const { data: types } = await query.graph({
    entity: "product_type",
    fields: ["id"],
  })
  if (types.length) {
    await deleteProductTypesWorkflow(container).run({
      input: { ids: types.map((type) => type.id) },
    })
    log(`deleted ${types.length} product types`)
  }

  const { data: priceLists } = await query.graph({
    entity: "price_list",
    fields: ["id"],
  })
  if (priceLists.length) {
    await deletePriceListsWorkflow(container).run({
      input: { ids: priceLists.map((priceList) => priceList.id) },
    })
    log(`deleted ${priceLists.length} price lists`)
  }

  // Inventory ---------------------------------------------------------------
  // Includes the items that were detached from a deleted variant earlier (the
  // delete-products workflow only removes an item no other variant still uses).
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })
  const inventoryIds = inventoryItems.map((item) => item.id)

  if (inventoryIds.length) {
    const { data: reservations } = await query.graph({
      entity: "reservation",
      fields: ["id"],
      filters: { inventory_item_id: inventoryIds },
    })
    if (reservations.length) {
      await deleteReservationsWorkflow(container).run({
        input: { ids: reservations.map((reservation) => reservation.id) },
      })
      log(`deleted ${reservations.length} reservations`)
    }

    for (let index = 0; index < inventoryIds.length; index += 50) {
      await deleteInventoryItemWorkflow(container).run({
        input: inventoryIds.slice(index, index + 50),
      })
    }
    log(`deleted ${inventoryIds.length} inventory items`)
  }

  // The low-stock job's record of what it already mailed points at levels that
  // just went with the items.
  const stockAlert = container.resolve<StockAlertService>("stock_alert")
  const alerts = await stockAlert.listStockAlerts({})
  if (alerts.length) {
    await stockAlert.deleteStockAlerts(alerts.map((alert) => alert.id))
    log(`deleted ${alerts.length} low-stock alert records`)
  }

  log(
    "done — no products, categories, collections, tags, types, price lists or stock remain"
  )
}
