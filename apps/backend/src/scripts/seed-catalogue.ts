import { readFileSync } from "fs"
import { join } from "path"

import type { ExecArgs, RemoteQueryFunction } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductTagsWorkflow,
  createProductTypesWorkflow,
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

/**
 * Fills the shop with a department-store catalogue: 194 products across 24
 * leaf categories in 8 departments, each published, priced in USD and EUR, in
 * the store's sales channel, with a shipping profile and stock at the
 * warehouse — so a fresh install has a shop that lists, filters, opens product
 * pages and can be checked out end to end.
 *
 * The product data (titles, descriptions, brands, prices, ratings, photography)
 * is vendored in `data/storefront-catalogue.json`, so the run needs no network
 * and produces the same catalogue every time.
 *
 * Run it from `apps/backend`, after emptying the catalogue:
 *
 * ```bash
 * pnpm run reset-catalog
 * pnpm run seed-catalogue
 * ```
 *
 * Re-running it skips products that already exist by handle, and only creates
 * the inventory levels that are missing, so it can top up a database that was
 * emptied by hand.
 */

type CatalogueProduct = {
  id: number
  handle: string
  title: string
  description: string
  category: string
  brand: string | null
  price: number
  stock: number
  sku: string
  weight: number
  dimensions: { width: number; height: number; depth: number } | null
  images: string[]
  rating: number
  reviewCount: number
  discountPercentage: number
  warranty: string | null
  shipping: string | null
  returns: string | null
  minimumOrder: number
  tags: string[]
}

const CATALOGUE: CatalogueProduct[] = JSON.parse(
  readFileSync(join(__dirname, "data", "storefront-catalogue.json"), "utf-8")
)

/** Departments, each with the leaf categories the products are filed under. */
const DEPARTMENTS: {
  name: string
  handle: string
  children: { key: string; name: string; handle: string }[]
}[] = [
  {
    name: "Electronics",
    handle: "electronics",
    children: [
      { key: "laptops", name: "Laptops", handle: "laptops" },
      { key: "smartphones", name: "Smartphones", handle: "smartphones" },
      { key: "tablets", name: "Tablets", handle: "tablets" },
      {
        key: "mobile-accessories",
        name: "Mobile Accessories",
        handle: "mobile-accessories",
      },
    ],
  },
  {
    name: "Women",
    handle: "women",
    children: [
      { key: "womens-dresses", name: "Dresses", handle: "dresses" },
      { key: "tops", name: "Tops", handle: "tops" },
      { key: "womens-shoes", name: "Women's Shoes", handle: "womens-shoes" },
      { key: "womens-bags", name: "Handbags", handle: "handbags" },
      { key: "womens-watches", name: "Women's Watches", handle: "womens-watches" },
      {
        key: "womens-jewellery",
        name: "Jewellery",
        handle: "jewellery",
      },
    ],
  },
  {
    name: "Men",
    handle: "men",
    children: [
      { key: "mens-shirts", name: "Shirts", handle: "mens-shirts" },
      { key: "mens-shoes", name: "Men's Shoes", handle: "mens-shoes" },
      { key: "mens-watches", name: "Men's Watches", handle: "mens-watches" },
    ],
  },
  {
    name: "Beauty",
    handle: "beauty-care",
    children: [
      { key: "beauty", name: "Makeup", handle: "makeup" },
      { key: "fragrances", name: "Fragrances", handle: "fragrances" },
      { key: "skin-care", name: "Skin Care", handle: "skin-care" },
    ],
  },
  {
    name: "Home & Kitchen",
    handle: "home-kitchen",
    children: [
      { key: "furniture", name: "Furniture", handle: "furniture" },
      { key: "home-decoration", name: "Home Decoration", handle: "home-decoration" },
      {
        key: "kitchen-accessories",
        name: "Kitchen Accessories",
        handle: "kitchen-accessories",
      },
    ],
  },
  {
    name: "Grocery",
    handle: "grocery",
    children: [{ key: "groceries", name: "Groceries", handle: "groceries" }],
  },
  {
    name: "Sports & Outdoors",
    handle: "sports-outdoors",
    children: [
      {
        key: "sports-accessories",
        name: "Sports Accessories",
        handle: "sports-accessories",
      },
    ],
  },
  {
    name: "Automotive",
    handle: "automotive",
    children: [
      { key: "motorcycle", name: "Motorcycles", handle: "motorcycles" },
      { key: "vehicle", name: "Cars", handle: "cars" },
    ],
  },
]

/** Collections are curated from the catalogue's own numbers, so they stay
 * populated whatever the data holds. The first match wins. */
const COLLECTIONS: { title: string; handle: string; matches: (p: CatalogueProduct) => boolean }[] = [
  { title: "Best Sellers", handle: "best-sellers", matches: (p) => p.rating >= 4.5 },
  { title: "New Arrivals", handle: "new-arrivals", matches: (p) => p.id >= 150 },
  { title: "Tech Essentials", handle: "tech-essentials", matches: (p) => ["laptops", "smartphones", "tablets", "mobile-accessories"].includes(p.category) },
  { title: "Home Refresh", handle: "home-refresh", matches: (p) => ["furniture", "home-decoration", "kitchen-accessories"].includes(p.category) },
  { title: "Beauty Edit", handle: "beauty-edit", matches: (p) => ["beauty", "fragrances", "skin-care"].includes(p.category) },
  { title: "Under $50", handle: "under-50", matches: (p) => p.price < 50 },
  { title: "Gift Guide", handle: "gift-guide", matches: (p) => p.price <= 75 },
  { title: "Premium Picks", handle: "premium-picks", matches: (p) => p.price >= 300 },
]

/** Products that are sized; everything else is sold in one size. */
const SIZED_CATEGORIES = ["mens-shirts", "tops", "womens-dresses"]
const SHOE_CATEGORIES = ["mens-shoes", "womens-shoes"]

/** The currencies every price is written in: the store's own region plus EUR,
 * which the search index also prices (see `src/search/helpers/pricing.ts`). */
const CURRENCIES = [
  { code: "usd", rate: 1 },
  { code: "eur", rate: 0.92 },
]

/** Products created per workflow run, so one bad row cannot roll back the shop. */
const BATCH_SIZE = 10

type SeedContext = {
  container: ExecArgs["container"]
  logger: { info: (message: string) => void }
  query: Omit<RemoteQueryFunction, symbol>
}

export default async function seedCatalogue({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const ctx: SeedContext = { container, logger, query }

  const log = (message: string) => logger.info(`[seed-catalogue] ${message}`)

  const store = container.resolve(Modules.STORE)
  const [storeRecord] = await store.listStores({}, { take: 1 })

  if (!storeRecord) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "No store exists. Run `pnpm run backend:seed` first."
    )
  }

  const salesChannelId = storeRecord.default_sales_channel_id
  const stockLocationId = storeRecord.default_location_id

  if (!salesChannelId || !stockLocationId) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "The store has no default sales channel or stock location. Run `pnpm run backend:seed` first."
    )
  }

  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "type"],
  })
  const shippingProfile = profiles.find(
    (profile: { type?: string }) => profile.type === "default"
  )

  if (!shippingProfile) {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      "No default shipping profile exists. Run `pnpm run backend:seed` first."
    )
  }

  const refs = await ensureReferenceData(ctx, shippingProfile.id)
  await createProducts(ctx, refs, salesChannelId)
  await ensureDepartmentLinks(ctx, refs)
  await ensureInventoryLevels(ctx, stockLocationId)
  await reindexSearch(ctx)

  log(
    `catalogue ready: ${CATALOGUE.length} products, ${DEPARTMENTS.length} departments, ${COLLECTIONS.length} collections`
  )
}

type Refs = {
  categories: Map<string, string>
  collections: Map<string, string>
  tags: Map<string, string>
  types: Map<string, string>
  shippingProfileId: string
}

/** Categories, collections, tags and product types the products refer to. */
async function ensureReferenceData(
  ctx: SeedContext,
  shippingProfileId: string
): Promise<Refs> {
  const { data: existingCategories } = await ctx.query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  })
  const categoryByHandle = new Map<string, string>(
    existingCategories.map((category: { id: string; handle: string }) => [
      category.handle,
      category.id,
    ])
  )

  const departments = DEPARTMENTS.filter(
    (department) => !categoryByHandle.has(department.handle)
  )
  const children = DEPARTMENTS.flatMap((department) =>
    department.children.map((child) => ({
      ...child,
      parent: department.handle,
    }))
  ).filter((child) => !categoryByHandle.has(`${child.parent}/${child.handle}`) && !categoryByHandle.has(child.handle))

  if (departments.length) {
    const { result } = await createProductCategoriesWorkflow(ctx.container).run({
      input: {
        product_categories: departments.map((department) => ({
          name: department.name,
          handle: department.handle,
          is_active: true,
          is_internal: false,
        })),
      },
    })

    for (const category of result) {
      if (category.handle) {
        categoryByHandle.set(category.handle, category.id)
      }
    }
  }

  if (children.length) {
    await createProductCategoriesWorkflow(ctx.container).run({
      input: {
        product_categories: children.map((child) => ({
          name: child.name,
          handle: child.handle,
          parent_category_id: categoryByHandle.get(child.parent),
          is_active: true,
          is_internal: false,
        })),
      },
    })
  }

  const { data: categoriesAfter } = await ctx.query.graph({
    entity: "product_category",
    fields: ["id", "handle", "parent_category.handle"],
  })

  const categories = new Map<string, string>()
  for (const category of categoriesAfter as {
    id: string
    handle: string
    parent_category?: { handle?: string } | null
  }[]) {
    categories.set(category.handle, category.id)
    if (category.parent_category?.handle) {
      categories.set(`${category.parent_category.handle}/${category.handle}`, category.id)
    }
  }

  ctx.logger.info(
    `[seed-catalogue] ${categoriesAfter.length} categories in place`
  )

  // Collections ---------------------------------------------------------------
  const { data: existingCollections } = await ctx.query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  })
  const collectionByHandle = new Map<string, string>(
    existingCollections.map((collection: { id: string; handle: string }) => [
      collection.handle,
      collection.id,
    ])
  )

  const missingCollections = COLLECTIONS.filter(
    (collection) => !collectionByHandle.has(collection.handle)
  )

  if (missingCollections.length) {
    const { result } = await createCollectionsWorkflow(ctx.container).run({
      input: {
        collections: missingCollections.map(({ title, handle }) => ({
          title,
          handle,
        })),
      },
    })

    for (const collection of result) {
      if (collection.handle) {
        collectionByHandle.set(collection.handle, collection.id)
      }
    }
  }

  // Tags ----------------------------------------------------------------------
  const tagValues = Array.from(
    new Set(CATALOGUE.flatMap((product) => product.tags))
  )
  const { data: existingTags } = await ctx.query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
  })
  const tagByValue = new Map<string, string>(
    existingTags.map((tag: { id: string; value: string }) => [tag.value, tag.id])
  )

  const missingTags = tagValues.filter((value) => !tagByValue.has(value))
  if (missingTags.length) {
    const { result } = await createProductTagsWorkflow(ctx.container).run({
      input: { product_tags: missingTags.map((value) => ({ value })) },
    })

    for (const tag of result) {
      tagByValue.set(tag.value, tag.id)
    }
  }

  // Product types -------------------------------------------------------------
  const typeValues = Array.from(
    new Set(
      DEPARTMENTS.flatMap((department) =>
        department.children.map((child) => child.name)
      )
    )
  )
  const { data: existingTypes } = await ctx.query.graph({
    entity: "product_type",
    fields: ["id", "value"],
  })
  const typeByValue = new Map<string, string>(
    existingTypes.map((type: { id: string; value: string }) => [type.value, type.id])
  )

  const missingTypes = typeValues.filter((value) => !typeByValue.has(value))
  if (missingTypes.length) {
    const { result } = await createProductTypesWorkflow(ctx.container).run({
      input: { product_types: missingTypes.map((value) => ({ value })) },
    })

    for (const type of result) {
      typeByValue.set(type.value, type.id)
    }
  }

  return {
    categories,
    collections: collectionByHandle,
    tags: tagByValue,
    types: typeByValue,
    shippingProfileId,
  }
}

/** The category a product is filed under, by dummyjson category key. */
const LEAF_BY_KEY = new Map(
  DEPARTMENTS.flatMap((department) =>
    department.children.map((child) => [
      child.key,
      { name: child.name, handle: child.handle, department: department.handle },
    ])
  )
)

type VariantPlan = {
  optionTitle: string
  values: string[]
}

function variantPlan(product: CatalogueProduct): VariantPlan {
  if (SIZED_CATEGORIES.includes(product.category)) {
    return { optionTitle: "Size", values: ["S", "M", "L", "XL", "XXL"] }
  }

  if (SHOE_CATEGORIES.includes(product.category)) {
    return { optionTitle: "Size", values: ["US 7", "US 8", "US 9", "US 10", "US 11"] }
  }

  return { optionTitle: "Size", values: ["One Size"] }
}

function skuFor(product: CatalogueProduct, variantValue: string, index: number) {
  return variantPlan(product).values.length > 1
    ? `${product.sku}-${variantValue.replace(/\s+/g, "")}`
    : product.sku || `SKU-${product.id}-${index}`
}

/** Stock is split across a product's variants, keeping whichever sizes the
 * source catalogue says are scarce scarce. */
function stockFor(product: CatalogueProduct, variantIndex: number, variantCount: number) {
  if (product.stock <= 0) {
    return 0
  }

  const base = Math.floor(product.stock / variantCount)
  const spread = product.id % 4

  return Math.max(1, base + (variantIndex % 3) * spread)
}

async function createProducts(
  ctx: SeedContext,
  refs: Refs,
  salesChannelId: string
) {
  const { data: existing } = await ctx.query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })
  const existingHandles = new Set(
    existing.map((product: { handle: string }) => product.handle)
  )

  const missing = CATALOGUE.filter(
    (product) => !existingHandles.has(product.handle)
  )

  if (!missing.length) {
    ctx.logger.info("[seed-catalogue] every product already exists")
    return
  }

  const products = missing.map((item) => {
    const plan = variantPlan(item)
    const leaf = LEAF_BY_KEY.get(item.category)
    const collection = COLLECTIONS.find((candidate) => candidate.matches(item))

    return {
      title: item.title,
      handle: item.handle,
      description: item.description,
      status: ProductStatus.PUBLISHED,
      thumbnail: item.images[0],
      images: item.images.map((url) => ({ url })),
      weight: item.weight,
      length: item.dimensions?.depth,
      width: item.dimensions?.width,
      height: item.dimensions?.height,
      material: MATERIAL_BY_CATEGORY[item.category] ?? null,
      shipping_profile_id: refs.shippingProfileId,
      // Filed under its own leaf category and the department above it, so the
      // department page lists everything it sells.
      category_ids: (leaf ? [leaf.handle, leaf.department] : [])
        .map((handle) => refs.categories.get(handle))
        .filter((id): id is string => Boolean(id)),
      collection_id: collection
        ? refs.collections.get(collection.handle)
        : undefined,
      type_id: leaf ? refs.types.get(leaf.name) : undefined,
      tag_ids: item.tags
        .map((tag) => refs.tags.get(tag))
        .filter((id): id is string => Boolean(id)),
      sales_channels: [{ id: salesChannelId }],
      metadata: {
        brand: item.brand,
        rating: item.rating,
        review_count: item.reviewCount,
        discount_percentage: item.discountPercentage,
        warranty_information: item.warranty,
        shipping_information: item.shipping,
        return_policy: item.returns,
        minimum_order_quantity: item.minimumOrder,
      },
      options: [{ title: plan.optionTitle, values: plan.values }],
      variants: plan.values.map((value, index) => ({
        title: plan.values.length > 1 ? value : item.title,
        sku: skuFor(item, value, index),
        options: { [plan.optionTitle]: value },
        // A variant that manages its inventory gets a default inventory item
        // from the workflow; the stock level is added afterwards.
        manage_inventory: true,
        allow_backorder: false,
        prices: CURRENCIES.map((currency) => ({
          currency_code: currency.code,
          amount: Math.round(item.price * currency.rate * 100) / 100,
        })),
      })),
    }
  })

  for (let start = 0; start < products.length; start += BATCH_SIZE) {
    await createProductsWorkflow(ctx.container).run({
      input: { products: products.slice(start, start + BATCH_SIZE) },
    })

    ctx.logger.info(
      `[seed-catalogue] created ${Math.min(start + BATCH_SIZE, products.length)}/${products.length} products`
    )
  }
}

/**
 * Adds the department to products that only carry their leaf category, which
 * is what a re-run over a catalogue seeded by an older version finds.
 */
async function ensureDepartmentLinks(ctx: SeedContext, refs: Refs) {
  const { data: products } = await ctx.query.graph({
    entity: "product",
    fields: ["id", "handle", "categories.id"],
  })

  const byHandle = new Map(
    (products as { id: string; handle: string; categories?: { id?: string }[] }[]).map(
      (product) => [product.handle, product]
    )
  )

  const repairs: { id: string; category_ids: string[] }[] = []

  for (const item of CATALOGUE) {
    const product = byHandle.get(item.handle)
    const leaf = LEAF_BY_KEY.get(item.category)

    if (!product || !leaf) {
      continue
    }

    const leafId = refs.categories.get(leaf.handle)
    const departmentId = refs.categories.get(leaf.department)
    const current = new Set((product.categories ?? []).map((category) => category.id))

    if (!leafId || !departmentId || current.has(departmentId)) {
      continue
    }

    repairs.push({ id: product.id, category_ids: [leafId, departmentId] })
  }

  if (!repairs.length) {
    return
  }

  await updateProductsWorkflow(ctx.container).run({
    input: { products: repairs },
  })

  ctx.logger.info(
    `[seed-catalogue] added the department category to ${repairs.length} product(s)`
  )
}

/** What the product is made of, where the source data is silent. */
const MATERIAL_BY_CATEGORY: Record<string, string> = {
  "mens-shirts": "100% cotton",
  tops: "Cotton blend",
  "womens-dresses": "Viscose",
  "mens-shoes": "Leather and rubber",
  "womens-shoes": "Leather and rubber",
  furniture: "Solid wood and upholstery",
  "home-decoration": "Glass and ceramic",
  "kitchen-accessories": "Stainless steel",
  sunglasses: "Acetate",
  "womens-bags": "Genuine leather",
  "womens-jewellery": "Gold-plated brass",
}

async function ensureInventoryLevels(ctx: SeedContext, stockLocationId: string) {
  const { data: items } = await ctx.query.graph({
    entity: "inventory_item",
    fields: ["id", "sku", "location_levels.location_id"],
  })

  /** variant sku -> units, from the same plan the variants were created with. */
  const stock = new Map<string, number>()
  for (const product of CATALOGUE) {
    const values = variantPlan(product).values
    values.forEach((value, index) => {
      stock.set(
        skuFor(product, value, index),
        stockFor(product, index, values.length)
      )
    })
  }

  const missing = (items as {
    id: string
    sku?: string | null
    location_levels?: { location_id?: string }[] | null
  }[]).filter(
    (item) =>
      stock.has(item.sku ?? "") &&
      !(item.location_levels ?? []).some(
        (level) => level?.location_id === stockLocationId
      )
  )

  if (!missing.length) {
    ctx.logger.info("[seed-catalogue] every variant already has stock")
    return
  }

  await createInventoryLevelsWorkflow(ctx.container).run({
    input: {
      inventory_levels: missing.map((item) => ({
        location_id: stockLocationId,
        inventory_item_id: item.id,
        stocked_quantity: stock.get(item.sku ?? "") ?? 0,
      })),
    },
  })

  const stocked = missing.filter((item) => (stock.get(item.sku ?? "") ?? 0) > 0)

  ctx.logger.info(
    `[seed-catalogue] stocked ${stocked.length}/${missing.length} inventory levels at the warehouse`
  )
}

/**
 * The storefront listing is served by the product search index, and a
 * short-lived `medusa exec` process can exit before the event bus has ingested
 * the last batch. A full reindex is awaited and also drops anything the reset
 * removed.
 */
async function reindexSearch(ctx: SeedContext) {
  const search = ctx.container.resolve(Modules.SEARCH)
  const { indexes } = await search.reindex({ index: "product" })

  const productIndex = (await search.listIndexes()).find(
    (index: { name: string }) => index.name === "product"
  )

  if (productIndex?.status !== "ready") {
    throw new MedusaError(
      MedusaError.Types.UNEXPECTED_STATE,
      `Product search index is not ready (status: ${productIndex?.status ?? "missing"}).`
    )
  }

  ctx.logger.info(
    `[seed-catalogue] rebuilt the product search index (${indexes.join(", ")})`
  )
}
