/**
 * Creates the store, currencies, region and tax regions, sales channel and
 * publishable key, warehouse with its shipping options, promotions, and
 * removes the starter's placeholder products. No products of its own: those
 * come from seed-catalogue.ts.
 *
 * Re-runnable, like every seed here.
 */
import {
  createApiKeysWorkflow,
  createPromotionsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteProductsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import type { ExecArgs } from "@medusajs/framework/types"

// --- What gets seeded --------------------------------------------------------

const STORE_NAME = "DevCart"
const SALES_CHANNEL_NAME = "Default Sales Channel"
const REGION_NAME = "Europe"
const STOCK_LOCATION_NAME = "European Warehouse"
const FULFILLMENT_SET_NAME = "European Warehouse delivery"
const FULFILLMENT_PROVIDER_ID = "manual_manual"
const DEFAULT_SHIPPING_PROFILE_NAME = "Default Shipping Profile"
const DEFAULT_CURRENCY = "eur"
const CURRENCIES = ["eur", "usd"]
const COUNTRIES = ["gb", "de", "dk", "se", "fr", "es", "it"]

/** What the region can be paid with. Stripe only exists when its key is set. */
const MANUAL_PAYMENT_PROVIDER = "pp_system_default"
const STRIPE_PAYMENT_PROVIDER = "pp_stripe_stripe"

const requiredPaymentProviders = () =>
  process.env.STRIPE_API_KEY
    ? [MANUAL_PAYMENT_PROVIDER, STRIPE_PAYMENT_PROVIDER]
    : [MANUAL_PAYMENT_PROVIDER]

/** Demo codes: a percentage, and a fixed amount that has to name a currency. */
const PROMOTIONS = [
  {
    code: "DEBUG10",
    is_automatic: false,
    type: "standard" as const,
    status: "active" as const,
    application_method: {
      type: "percentage" as const,
      target_type: "order" as const,
      allocation: "across" as const,
      value: 10,
    },
  },
  {
    code: "FIVEOFF",
    is_automatic: false,
    type: "standard" as const,
    status: "active" as const,
    application_method: {
      type: "fixed" as const,
      target_type: "order" as const,
      allocation: "across" as const,
      value: 5,
      currency_code: DEFAULT_CURRENCY,
    },
  },
]

/** Placeholder data from Medusa's initial-data-seed. */
const LEGACY_HANDLES = ["t-shirt", "sweatshirt", "sweatpants", "shorts"]
const LEGACY_CATEGORY_HANDLES = ["shirts", "sweatshirts", "pants", "merch"]

const SHIPPING_OPTIONS = [
  {
    name: "Standard Shipping",
    label: "Standard",
    description: "Ship in 2-3 days.",
    code: "standard",
    amount: 5,
  },
  {
    name: "Express Shipping",
    label: "Express",
    description: "Ship in 24 hours.",
    code: "express",
    amount: 15,
  },
]

// --- Helpers -----------------------------------------------------------------

const createContext = (container: ExecArgs["container"]) => ({
  container,
  query: container.resolve(ContainerRegistrationKeys.QUERY),
  link: container.resolve(ContainerRegistrationKeys.LINK),
  logger: container.resolve(ContainerRegistrationKeys.LOGGER),
})

type SeedContext = ReturnType<typeof createContext>

// --- Infrastructure ----------------------------------------------------------

async function ensureSalesChannel(ctx: SeedContext) {
  const { data } = await ctx.query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const existing = data.find(
    (channel: { name: string }) => channel.name === SALES_CHANNEL_NAME
  )

  if (existing) {
    ctx.logger.info(`Sales channel "${SALES_CHANNEL_NAME}" already exists.`)
    return existing.id as string
  }

  const {
    result: [channel],
  } = await createSalesChannelsWorkflow(ctx.container).run({
    input: {
      salesChannelsData: [
        { name: SALES_CHANNEL_NAME, description: "DevCart storefront" },
      ],
    },
  })

  ctx.logger.info(`Created sales channel "${SALES_CHANNEL_NAME}".`)
  return channel.id
}

async function ensureStore(ctx: SeedContext, salesChannelId: string) {
  const { data } = await ctx.query.graph({
    entity: "store",
    fields: ["id", "name", "supported_currencies.currency_code"],
  })

  if (data.length) {
    return data[0] as { id: string; supported_currencies?: { currency_code?: string }[] }
  }

  const {
    result: [store],
  } = await createStoresWorkflow(ctx.container).run({
    input: {
      stores: [
        {
          name: STORE_NAME,
          supported_currencies: CURRENCIES.map((currency_code) => ({
            currency_code,
            is_default: currency_code === DEFAULT_CURRENCY,
          })),
          default_sales_channel_id: salesChannelId,
        },
      ],
    },
  })

  ctx.logger.info(`Created store "${STORE_NAME}".`)
  return store as { id: string; supported_currencies?: { currency_code?: string }[] }
}

async function ensurePublishableApiKey(ctx: SeedContext, salesChannelId: string) {
  const { data } = await ctx.query.graph({
    entity: "api_key",
    fields: ["id", "title", "type"],
  })
  const existing = data.find(
    (key: { type: string }) => key.type === "publishable"
  )

  if (existing) {
    ctx.logger.info(`Publishable API key "${existing.title}" already exists.`)
    return
  }

  const {
    result: [key],
  } = await createApiKeysWorkflow(ctx.container).run({
    input: {
      api_keys: [
        {
          title: "DevCart Storefront",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  })

  await linkSalesChannelsToApiKeyWorkflow(ctx.container).run({
    input: { id: key.id, add: [salesChannelId] },
  })

  ctx.logger.info(
    "Created a publishable API key. Copy its token from Admin → Settings → API keys into NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY."
  )
}

async function ensureRegion(ctx: SeedContext) {
  const { data } = await ctx.query.graph({
    entity: "region",
    fields: ["id", "name", "payment_providers.id"],
  })
  const existing = data.find(
    (region: { name: string }) => region.name === REGION_NAME
  )

  if (existing) {
    const currentProviders = (existing.payment_providers ?? [])
      .map((provider) => provider?.id)
      .filter((id): id is string => Boolean(id))

    await ensureRegionPaymentProviders(ctx, existing.id as string, currentProviders)
    return existing.id as string
  }

  const {
    result: [region],
  } = await createRegionsWorkflow(ctx.container).run({
    input: {
      regions: [
        {
          name: REGION_NAME,
          currency_code: DEFAULT_CURRENCY,
          countries: COUNTRIES,
          payment_providers: requiredPaymentProviders(),
        },
      ],
    },
  })

  ctx.logger.info(`Created region "${REGION_NAME}".`)
  return region.id as string
}

/** Adds any payment provider the region is missing; existing ones stay. */
async function ensureRegionPaymentProviders(
  ctx: SeedContext,
  regionId: string,
  current: string[]
) {
  const missing = requiredPaymentProviders().filter(
    (id) => !current.includes(id)
  )

  if (!missing.length) {
    ctx.logger.info(
      `Region "${REGION_NAME}" already offers every configured payment provider.`
    )
    return
  }

  await updateRegionsWorkflow(ctx.container).run({
    input: {
      selector: { id: regionId },
      update: { payment_providers: [...current, ...missing] },
    },
  })

  ctx.logger.info(
    `Enabled ${missing.join(", ")} on region "${REGION_NAME}".`
  )
}

async function ensureTaxRegions(ctx: SeedContext) {
  const { data } = await ctx.query.graph({
    entity: "tax_region",
    fields: ["id", "country_code"],
  })
  const missing = COUNTRIES.filter(
    (country) =>
      !data.some(
        (region: { country_code: string }) => region.country_code === country
      )
  )

  if (!missing.length) {
    ctx.logger.info("Tax regions already exist.")
    return
  }

  await createTaxRegionsWorkflow(ctx.container).run({
    input: missing.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  })

  ctx.logger.info(`Created ${missing.length} tax region(s).`)
}

async function ensureStockLocation(ctx: SeedContext, salesChannelId: string) {
  const { data: existing } = await ctx.query.graph({
    entity: "stock_location",
    fields: ["id", "name", "fulfillment_sets.id"],
  })
  const store = ctx.container.resolve(Modules.STORE)
  const [storeRecord] = await store.listStores({}, { take: 1 })

  /* Reuse an existing location: a fulfillment set links to exactly one, so a
   * second location cannot share the set the shipping options belong to. */
  let stockLocationId =
    storeRecord?.default_location_id ??
    existing.find((location) => (location.fulfillment_sets ?? []).length)?.id ??
    existing.find((location) => location.name === STOCK_LOCATION_NAME)?.id ??
    existing[0]?.id

  if (!stockLocationId) {
    const {
      result: [location],
    } = await createStockLocationsWorkflow(ctx.container).run({
      input: {
        locations: [
          {
            name: STOCK_LOCATION_NAME,
            address: { city: "Copenhagen", country_code: "DK", address_1: "" },
          },
        ],
      },
    })

    stockLocationId = location.id
    ctx.logger.info(`Created stock location "${STOCK_LOCATION_NAME}".`)
  }

  // The links are read back from the graph, so an existing location and a newly
  // created one go through the same code.
  const { data: locations } = await ctx.query.graph({
    entity: "stock_location",
    fields: ["id", "fulfillment_providers.id", "sales_channels.id"],
    filters: { id: stockLocationId },
  })
  const stockLocation = locations[0]

  if (!stockLocation) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Stock location ${stockLocationId} could not be read back.`
    )
  }

  const hasFulfillmentProvider = (
    stockLocation.fulfillment_providers ?? []
  ).some((provider) => provider?.id === FULFILLMENT_PROVIDER_ID)

  if (!hasFulfillmentProvider) {
    await ctx.link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: FULFILLMENT_PROVIDER_ID,
      },
    })
  }

  // A sales channel can only sell what its stock locations hold.
  const hasSalesChannel = (stockLocation.sales_channels ?? []).some(
    (channel) => channel?.id === salesChannelId
  )

  if (!hasSalesChannel) {
    await linkSalesChannelsToStockLocationWorkflow(ctx.container).run({
      input: { id: stockLocation.id, add: [salesChannelId] },
    })
  }

  return stockLocation.id
}

async function ensureFulfillmentSet(ctx: SeedContext, stockLocationId: string) {
  const fulfillment = ctx.container.resolve(Modules.FULFILLMENT)
  const { data: sets } = await ctx.query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name"],
  })
  let fulfillmentSetId = sets.find(
    (set) => set.name === FULFILLMENT_SET_NAME
  )?.id

  if (!fulfillmentSetId) {
    const created = await fulfillment.createFulfillmentSets({
      name: FULFILLMENT_SET_NAME,
      type: "shipping",
    })

    fulfillmentSetId = created.id
    ctx.logger.info(`Created fulfillment set "${FULFILLMENT_SET_NAME}".`)
  }

  // The service zone decides which countries an option can quote, so the seed
  // looks for its own zone by name. A starter seed may already own this set with
  // a zone for another region, and reusing that one leaves the region without
  // shipping options at checkout.
  const { data: setsWithZones } = await ctx.query.graph({
    entity: "fulfillment_set",
    fields: ["id", "service_zones.id", "service_zones.name"],
    filters: { id: fulfillmentSetId },
  })
  const zones = setsWithZones[0]?.service_zones ?? []
  let serviceZoneId = zones.find((zone) => zone.name === REGION_NAME)?.id

  if (!serviceZoneId) {
    const zone = await fulfillment.createServiceZones({
      name: REGION_NAME,
      fulfillment_set_id: fulfillmentSetId,
      geo_zones: COUNTRIES.map((country_code) => ({
        country_code,
        type: "country" as const,
      })),
    })

    serviceZoneId = zone.id
    ctx.logger.info(`Created service zone "${REGION_NAME}".`)
  }

  const { data: locations } = await ctx.query.graph({
    entity: "stock_location",
    fields: ["id", "fulfillment_sets.id"],
    filters: { id: stockLocationId },
  })
  const alreadyLinked = (locations[0]?.fulfillment_sets ?? []).some(
    (set) => set?.id === fulfillmentSetId
  )

  if (!alreadyLinked) {
    await ctx.link.create({
      [Modules.STOCK_LOCATION]: { stock_location_id: stockLocationId },
      [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSetId },
    })
  }

  return serviceZoneId
}

async function ensureShippingProfile(ctx: SeedContext) {
  const { data } = await ctx.query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  })

  if (data.length) {
    return data[0].id as string
  }

  const {
    result: [profile],
  } = await createShippingProfilesWorkflow(ctx.container).run({
    input: {
      data: [{ name: DEFAULT_SHIPPING_PROFILE_NAME, type: "default" }],
    },
  })

  ctx.logger.info(`Created shipping profile "${DEFAULT_SHIPPING_PROFILE_NAME}".`)
  return profile.id
}

async function ensureShippingOptions(
  ctx: SeedContext,
  serviceZoneId: string,
  shippingProfileId: string,
  currencyCodes: string[],
  regionId: string
) {
  const { data } = await ctx.query.graph({
    entity: "shipping_option",
    fields: ["id", "name", "service_zone_id"],
  })
  // Options are matched inside this region's zone: another seed's option with
  // the same name covers different countries and cannot be reused here.
  const inZone = data.filter(
    (existing: { service_zone_id: string }) =>
      existing.service_zone_id === serviceZoneId
  )
  const missing = SHIPPING_OPTIONS.filter(
    (option) =>
      !inZone.some((existing: { name: string }) => existing.name === option.name)
  )

  if (!missing.length) {
    ctx.logger.info("Shipping options already exist.")
    return
  }

  await createShippingOptionsWorkflow(ctx.container).run({
    input: missing.map((option) => ({
      name: option.name,
      price_type: "flat" as const,
      provider_id: FULFILLMENT_PROVIDER_ID,
      service_zone_id: serviceZoneId,
      shipping_profile_id: shippingProfileId,
      type: {
        label: option.label,
        description: option.description,
        code: option.code,
      },
      prices: [
        ...currencyCodes.map((currency_code) => ({
          currency_code,
          amount: option.amount,
        })),
        { region_id: regionId, amount: option.amount },
      ],
      rules: [
        { attribute: "enabled_in_store", value: "true", operator: "eq" as const },
        { attribute: "is_return", value: "false", operator: "eq" as const },
      ],
    })),
  })

  ctx.logger.info(`Created ${missing.length} shipping option(s).`)
}

/** Deletes the starter's placeholder products, unless orders exist. */
async function removeLegacyProducts(ctx: SeedContext) {
  const { data: orders } = await ctx.query.graph({ entity: "order", fields: ["id"] })

  if (orders.length) {
    ctx.logger.warn(
      "The store has orders, so the starter placeholder products were left alone. Remove them from the admin if you no longer want them."
    )
    return []
  }

  const { data: products } = await ctx.query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "deleted_at"],
  })
  const legacy = products.filter(
    (product) =>
      !product.deleted_at &&
      LEGACY_HANDLES.includes(product.handle ?? "") &&
      (product.title ?? "").startsWith("Medusa ")
  )

  if (!legacy.length) {
    return []
  }

  await deleteProductsWorkflow(ctx.container).run({
    input: { ids: legacy.map((product) => product.id) },
  })

  ctx.logger.info(
    `Deleted ${legacy.length} starter placeholder product(s): ${legacy
      .map((product) => product.handle)
      .join(", ")}.`
  )

  return legacy.map((product) => product.id)
}

/** Starter categories, removed only when no live product uses them. */
async function removeLegacyCategories(ctx: SeedContext) {
  const legacyHandles = LEGACY_CATEGORY_HANDLES
  const { data: categories } = await ctx.query.graph({
    entity: "product_category",
    fields: ["id", "handle", "deleted_at", "products.id", "products.deleted_at"],
  })
  const legacy = categories.filter(
    (category) =>
      !category.deleted_at &&
      legacyHandles.includes(category.handle ?? "") &&
      !(category.products ?? []).some((product) => !product?.deleted_at)
  )

  if (!legacy.length) {
    return
  }

  await deleteProductCategoriesWorkflow(ctx.container).run({
    input: legacy.map((category) => category.id),
  })

  ctx.logger.info(
    `Deleted ${legacy.length} starter category(ies): ${legacy
      .map((category) => category.handle)
      .join(", ")}.`
  )
}

/** A fresh index has no active version, so events replayed into it fail. The
 * reindex API handles the first seed and later rebuilds. */
async function reindexSearch(ctx: SeedContext) {
  const search = ctx.container.resolve(Modules.SEARCH)
  const result = await search.reindex({ index: "product" })

  await assertSearchIndexReady(ctx)
  ctx.logger.info(
    `Reindexed the product search index (${result.indexes.join(", ")}); status is ready.`
  )
}

async function assertSearchIndexReady(ctx: SeedContext) {
  const search = ctx.container.resolve(Modules.SEARCH)
  const indexDetails = await search.listIndexes()
  const productIndex = indexDetails.find((index) => index.name === "product")

  if (productIndex?.status !== "ready") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Product search index is not ready (status: ${productIndex?.status ?? "missing"}).`
    )
  }
}

/** Seeds the index before catalogue changes, so subscriber events do not race
 * an index with no active version. */
async function ensureSearchIndexReady(ctx: SeedContext) {
  const search = ctx.container.resolve(Modules.SEARCH)
  const indexDetails = await search.listIndexes()
  const productIndex = indexDetails.find((index) => index.name === "product")

  if (productIndex?.status === "ready") {
    return
  }

  ctx.logger.info("Initializing the product search index before catalogue changes.")
  await reindexSearch(ctx)
}

/** Creates missing demo promotion codes; existing ones are left as they are. */
async function ensurePromotions(ctx: SeedContext) {
  const { data: existing } = await ctx.query.graph({
    entity: "promotion",
    fields: ["id", "code"],
  })

  const known = new Set(
    existing.map((promotion) => String(promotion.code ?? "").toUpperCase())
  )
  const missing = PROMOTIONS.filter(
    (promotion) => !known.has(promotion.code.toUpperCase())
  )

  if (!missing.length) {
    return
  }

  await createPromotionsWorkflow(ctx.container).run({
    input: { promotionsData: missing },
  })

  ctx.logger.info(
    `Created ${missing.length} promotion code(s): ${missing
      .map((promotion) => promotion.code)
      .join(", ")}.`
  )
}

// --- Entry point -------------------------------------------------------------

export default async function seed({ container }: ExecArgs) {
  const ctx = createContext(container)

  ctx.logger.info("Seeding DevCart demo data...")

  const salesChannelId = await ensureSalesChannel(ctx)
  const store = await ensureStore(ctx, salesChannelId)
  const currencyCodes = (store.supported_currencies ?? [])
    .map((currency) => currency?.currency_code)
    .filter((code): code is string => Boolean(code))

  if (!currencyCodes.length) {
    ctx.logger.warn("The store has no supported currencies; prices were skipped.")
  }

  await ensurePublishableApiKey(ctx, salesChannelId)
  const regionId = await ensureRegion(ctx)
  await ensureTaxRegions(ctx)

  const stockLocationId = await ensureStockLocation(ctx, salesChannelId)
  const serviceZoneId = await ensureFulfillmentSet(ctx, stockLocationId)
  const shippingProfileId = await ensureShippingProfile(ctx)
  await ensureShippingOptions(
    ctx,
    serviceZoneId,
    shippingProfileId,
    currencyCodes,
    regionId
  )

  await ensureSearchIndexReady(ctx)
  await removeLegacyProducts(ctx)
  await removeLegacyCategories(ctx)
  await ensurePromotions(ctx)
  await reindexSearch(ctx)

  /* No products here: seed-catalogue.ts runs next and owns the catalogue. */
  ctx.logger.info(
    "Done. Store, region, sales channel, warehouse, shipping options and promotions are in place; the catalogue is seeded next."
  )
}
