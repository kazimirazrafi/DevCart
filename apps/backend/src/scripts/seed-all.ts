/**
 * Runs the four seeds in order: store setup, catalogue, reviews, then a
 * channel re-link and reindex. Each step is re-runnable, so a second run is a
 * no-op.
 *
 * From the repository root: pnpm run backend:seed
 */
import type { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { updateStoresWorkflow } from "@medusajs/medusa/core-flows"

import { REVIEW_MODULE } from "../modules/review"

import seedCatalogue from "./seed-catalogue"
import seedReviews from "./seed-reviews"
import seed from "./seed"
import refreshCatalogue from "./refresh-catalogue"

/** The name the shop presents itself with, in the admin and in every email. */
const STORE_NAME = "DevCart"

type StoreService = {
  listStores: (filters: object, config?: object) => Promise<
    { id: string; name: string; default_location_id?: string | null }[]
  >
}

type StockLocationService = {
  listStockLocations: (
    filters: object,
    config?: object
  ) => Promise<{ id: string; name: string }[]>
}

type ProductService = {
  listAndCountProducts: (
    filters: object
  ) => Promise<[Record<string, unknown>[], number]>
}

type ReviewService = {
  listAndCountReviews: (
    filters: object
  ) => Promise<[Record<string, unknown>[], number]>
}

export default async function seedAll(args: ExecArgs) {
  const { container } = args
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const steps: { name: string; run: (args: ExecArgs) => Promise<void> }[] = [
    { name: "store, region, shipping and promotions", run: seed },
    { name: "catalogue, categories and search index", run: seedCatalogue },
    { name: "reviews", run: seedReviews },
    { name: "sales channel links and reindex", run: refreshCatalogue },
  ]

  const runStep = async (step: (typeof steps)[number]) => {
    logger.info(`[seed-all] ${step.name}: starting`)

    try {
      await step.run(args)
    } catch (error) {
      // The deploy log has to name the step that failed: the four seeds leave
      // the database in different shapes, and "the seed failed" alone does not
      // say whether the catalogue or the reviews are missing.
      logger.error(
        `[seed-all] ${step.name}: failed — ${(error as Error).message}`
      )
      throw error
    }

    logger.info(`[seed-all] ${step.name}: done`)
  }

  await runStep(steps[0])
  await reconcileStore(container, logger)

  for (const step of steps.slice(1)) {
    await runStep(step)
  }

  const productService = container.resolve<ProductService>(Modules.PRODUCT)
  const storeService = container.resolve<StoreService>(Modules.STORE)
  const reviewService = container.resolve<ReviewService>(REVIEW_MODULE)

  const [, productCount] = await productService.listAndCountProducts({})
  const [, reviewCount] = await reviewService.listAndCountReviews({})

  const [named] = await storeService.listStores({}, { take: 1 })

  logger.info(
    `[seed-all] done: ${productCount} products, ${reviewCount} reviews, store "${named?.name ?? "missing"}".`
  )
}

/**
 * Sets the store name and points the store at the warehouse the first seed
 * created. A migrated database comes from Medusa's own initial-data-seed with
 * neither, and the catalogue seed needs the location.
 */
async function reconcileStore(
  container: ExecArgs["container"],
  logger: { info: (message: string) => void; warn: (message: string) => void }
) {
  const storeService = container.resolve<StoreService>(Modules.STORE)
  const [store] = await storeService.listStores(
    {},
    { take: 1, select: ["id", "name", "default_location_id"] }
  )

  if (!store) {
    logger.warn("[seed-all] no store to reconcile; run this against a migrated database")
    return
  }

  const update: { name?: string; default_location_id?: string } = {}

  if (store.name !== STORE_NAME) {
    update.name = STORE_NAME
  }

  if (!store.default_location_id) {
    const stockLocationService = container.resolve<StockLocationService>(
      Modules.STOCK_LOCATION
    )
    const [location] = await stockLocationService.listStockLocations(
      {},
      { take: 1 }
    )

    if (!location) {
      logger.warn(
        "[seed-all] no stock location to make the store's default; the catalogue seed will stop here"
      )

      return
    }

    update.default_location_id = location.id
  }

  if (!update.name && !update.default_location_id) {
    logger.info(`[seed-all] store is already "${STORE_NAME}" with a default location`)
    return
  }

  await updateStoresWorkflow(container).run({
    input: { selector: { id: store.id }, update },
  })

  logger.info(
    `[seed-all] store reconciled: name "${STORE_NAME}"` +
      (update.default_location_id ? ", default stock location set" : "")
  )
}
