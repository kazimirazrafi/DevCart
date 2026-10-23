/**
 * DevCart demo seed.
 *
 * Brings a Medusa instance from empty to a browsable store: store currencies,
 * a region with tax regions, a sales channel with a publishable key, a
 * warehouse with a fulfillment set and shipping options, then the DevCart
 * catalogue itself (10 categories, 3 collections, tags, options and 53 products
 * with variants, prices and stock).
 *
 *   pnpm run backend:seed                  # from the repository root
 *   npx medusa exec ./src/scripts/seed.ts  # from apps/backend
 *
 * Re-runnable. Every step looks for what it is about to create first, so
 * running it twice leaves the same data behind. Products are matched by handle,
 * and every handle is fixed in the catalogue below, so new products can be
 * added to the catalogue later and a re-run will create only those.
 *
 * The region's payment providers are reconciled rather than only created, so an
 * existing install picks Stripe up by setting `STRIPE_API_KEY` and re-running
 * this script: the manual provider stays, and `pp_stripe_stripe` is added once
 * the backend registers it.
 *
 * It also configures the demo promotion codes (`PROMOTIONS`) so the cart's
 * discount field has something real to accept, and deletes the placeholder
 * products the Medusa starter seeds (`LEGACY_HANDLES`), which still carry
 * starter branding. That deletion is skipped when the store already has orders,
 * so order history is never affected.
 */
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductTagsWorkflow,
  createProductsWorkflow,
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
  updateProductsWorkflow,
  updateRegionsWorkflow,
} from "@medusajs/medusa/core-flows"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import type { CreateProductDTO, ExecArgs } from "@medusajs/framework/types"

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

/**
 * What the region can be paid with. The manual provider is Medusa's own and is
 * always available; Stripe is only registered by `medusa-config.ts` when
 * `STRIPE_API_KEY` is set, and a region cannot be pointed at a provider the
 * backend does not know.
 */
const MANUAL_PAYMENT_PROVIDER = "pp_system_default"
const STRIPE_PAYMENT_PROVIDER = "pp_stripe_stripe"

const requiredPaymentProviders = () =>
  process.env.STRIPE_API_KEY
    ? [MANUAL_PAYMENT_PROVIDER, STRIPE_PAYMENT_PROVIDER]
    : [MANUAL_PAYMENT_PROVIDER]

/**
 * Codes the cart can apply out of the box. They exist so the discount path is
 * demonstrable on a fresh install rather than only in a test fixture: a
 * percentage that works in every currency, and a fixed amount scoped to the
 * region's default currency (a fixed discount has to name one).
 */
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

/** Units per variant unless the catalogue says otherwise. */
const DEFAULT_STOCK = 100

/**
 * Data created by the Medusa starter's `initial-data-seed.ts`. It is replaced
 * by the catalogue below; `removeLegacyData` keeps that replacement safe on a
 * store that already has orders.
 */
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

const CATEGORIES = [
  { name: "T-Shirts", handle: "t-shirts" },
  { name: "Sweatshirts & Hoodies", handle: "sweatshirts-hoodies" },
  { name: "Bottoms", handle: "bottoms" },
  { name: "Shirts", handle: "shirts" },
  { name: "Dresses", handle: "dresses" },
  { name: "Footwear", handle: "footwear" },
  { name: "Bags", handle: "bags" },
  { name: "Accessories", handle: "accessories" },
  { name: "Desk", handle: "desk" },
  { name: "Kits", handle: "kits" },
]

const COLLECTIONS = [
  {
    title: "Everyday Basics",
    handle: "everyday-basics",
    metadata: { description: "The pieces that get worn on a normal Tuesday." },
  },
  {
    title: "Desk & Debug",
    handle: "desk-and-debug",
    metadata: { description: "Objects for the hour before the deploy." },
  },
  {
    title: "Limited Run",
    handle: "limited-run",
    metadata: { description: "Small print runs, numbered and not repeated." },
  },
]

const TAGS = [
  "new-arrival",
  "bestseller",
  "organic",
  "unisex",
  "last-chance",
]

/** Options shared across products, so the store page's option filter has something to show. */
const SHARED_OPTIONS = [
  { title: "Size", values: ["S", "M", "L", "XL"] },
  { title: "Color", values: ["Black", "White"] },
]

// --- Catalogue ---------------------------------------------------------------

const IMAGE_BASE = "https://medusa-public-images.s3.eu-west-1.amazonaws.com"

/**
 * The public demo bucket only holds these product shots. Items either reuse a
 * shot that shows the right garment or, failing that, the closest one — real
 * photography is a later task.
 */
const IMAGES = {
  teeBlack: `${IMAGE_BASE}/tee-black-front.png`,
  teeBlackBack: `${IMAGE_BASE}/tee-black-back.png`,
  teeWhite: `${IMAGE_BASE}/tee-white-front.png`,
  teeWhiteBack: `${IMAGE_BASE}/tee-white-back.png`,
  sweatshirt: `${IMAGE_BASE}/sweatshirt-vintage-front.png`,
  sweatshirtBack: `${IMAGE_BASE}/sweatshirt-vintage-back.png`,
  sweatpants: `${IMAGE_BASE}/sweatpants-gray-front.png`,
  sweatpantsBack: `${IMAGE_BASE}/sweatpants-gray-back.png`,
  shorts: `${IMAGE_BASE}/shorts-vintage-front.png`,
  shortsBack: `${IMAGE_BASE}/shorts-vintage-back.png`,
  mug: `${IMAGE_BASE}/coffee-mug.png`,
}

const TEE_IMAGES = [
  IMAGES.teeBlack,
  IMAGES.teeBlackBack,
  IMAGES.teeWhite,
  IMAGES.teeWhiteBack,
]
const SWEATSHIRT_IMAGES = [IMAGES.sweatshirt, IMAGES.sweatshirtBack]
const SWEATPANTS_IMAGES = [IMAGES.sweatpants, IMAGES.sweatpantsBack]
const SHORTS_IMAGES = [IMAGES.shorts, IMAGES.shortsBack]
const MUG_IMAGES = [IMAGES.mug]
const KIT_IMAGES = [IMAGES.teeBlack, IMAGES.teeBlackBack, IMAGES.mug]

/**
 * Product photography for the wardrobe lines (shirts, dresses, footwear, bags,
 * accessories). The public Medusa demo bucket only has the ten garment shots
 * above, so everything else uses the open demo catalogue at dummyjson.com, whose
 * images are hosted for exactly this purpose. Files are named 1.webp, 2.webp, ...
 * under a folder per product, which is what `demoShots` expands.
 */
const DEMO_IMAGE_BASE = "https://cdn.dummyjson.com/product-images"

const demoShots = (path: string, count: number) =>
  Array.from(
    { length: count },
    (_, index) => `${DEMO_IMAGE_BASE}/${path}/${index + 1}.webp`
  )

const SIZE = { title: "Size", values: ["S", "M", "L", "XL"] }
const COLOR_AND_SIZE = [
  { title: "Color", values: ["Black", "White"] },
  SIZE,
]
/** Shoes are sized in EU numbers, so they cannot share the apparel `Size` option. */
const SHOE_SIZES = {
  title: "Shoe Size",
  values: ["39", "40", "41", "42", "43", "44"],
}

const TEE_PRICE = { eur: 28, usd: 32 }
const HOODIE_PRICE = { eur: 58, usd: 65 }
const CREWNECK_PRICE = { eur: 52, usd: 58 }
const JOGGER_PRICE = { eur: 52, usd: 58 }
const SHORTS_PRICE = { eur: 38, usd: 42 }
const MUG_PRICE = { eur: 16, usd: 18 }
const KIT_PRICE = { eur: 44, usd: 49 }

type OptionSpec = { title: string; values: string[] }

type CatalogueItem = {
  handle: string
  /** SKU stem; the option values are appended per variant. */
  sku: string
  title: string
  subtitle: string
  description: string
  category: string
  collections: string[]
  tags: string[]
  images: string[]
  options: OptionSpec[]
  price: Record<string, number>
  weight: number
  /** Units per variant. Defaults to DEFAULT_STOCK. */
  stock?: number
  /** Variant titles left at zero, so the out-of-stock state can be seen and tested. */
  soldOut?: string[]
}

const CATALOGUE: CatalogueItem[] = [
  {
    handle: "commit-early-tee",
    sku: "DC-TEE-COMMIT",
    title: "Commit Early Tee",
    subtitle: "240 gsm cotton tee",
    description:
      "The whole engineering philosophy on one chest print. Heavyweight combed cotton, straight hem, printed in one ink.",
    category: "T-Shirts",
    collections: ["Everyday Basics", "Limited Run"],
    tags: ["bestseller", "unisex"],
    images: TEE_IMAGES,
    options: COLOR_AND_SIZE,
    price: TEE_PRICE,
    weight: 180,
  },
  {
    handle: "works-on-my-machine-tee",
    sku: "DC-TEE-WOMM",
    title: "Works on My Machine Tee",
    subtitle: "240 gsm cotton tee",
    description:
      "The sentence that has closed more tickets than any fix. Printed small on the chest, so the joke lands at reading distance.",
    category: "T-Shirts",
    collections: ["Everyday Basics"],
    tags: ["bestseller", "unisex"],
    images: TEE_IMAGES,
    options: COLOR_AND_SIZE,
    price: TEE_PRICE,
    weight: 180,
  },
  {
    handle: "off-by-one-tee",
    sku: "DC-TEE-OFFBYONE",
    title: "Off By One Tee",
    subtitle: "240 gsm cotton tee",
    description:
      "Every off-by-one you have ever shipped, commemorated. One front print, no back print, nothing else.",
    category: "T-Shirts",
    collections: ["Everyday Basics"],
    tags: ["unisex"],
    images: TEE_IMAGES,
    options: COLOR_AND_SIZE,
    price: TEE_PRICE,
    weight: 180,
  },
  {
    handle: "hello-world-tee",
    sku: "DC-TEE-HELLO",
    title: "Hello World Tee",
    subtitle: "240 gsm cotton tee",
    description:
      "The first program most of us ran, on a shirt that outlives the tutorial it came from.",
    category: "T-Shirts",
    collections: ["Everyday Basics"],
    tags: ["organic", "unisex"],
    images: TEE_IMAGES,
    options: COLOR_AND_SIZE,
    price: TEE_PRICE,
    weight: 180,
  },
  {
    handle: "segfault-tee",
    sku: "DC-TEE-SEGFAULT",
    title: "Segfault Tee",
    subtitle: "240 gsm cotton tee",
    description:
      "A segfault, printed where everyone can see it. Part of a short run that will not be reprinted.",
    category: "T-Shirts",
    collections: ["Limited Run"],
    tags: ["new-arrival", "unisex"],
    images: TEE_IMAGES,
    options: COLOR_AND_SIZE,
    price: TEE_PRICE,
    weight: 180,
    stock: 5,
  },
  {
    handle: "rubber-duck-tee",
    sku: "DC-TEE-DUCK",
    title: "Rubber Duck Tee",
    subtitle: "240 gsm cotton tee",
    description:
      "For the colleague who never once disagreed with you. Small duck print, centred on the chest.",
    category: "T-Shirts",
    collections: ["Everyday Basics"],
    tags: ["bestseller", "unisex"],
    images: TEE_IMAGES,
    options: COLOR_AND_SIZE,
    price: TEE_PRICE,
    weight: 180,
  },
  {
    handle: "merge-conflict-tee",
    sku: "DC-TEE-MERGE",
    title: "Merge Conflict Tee",
    subtitle: "240 gsm cotton tee",
    description:
      "Two branches, one shirt, no resolution markers. Printed in one ink on heavyweight cotton.",
    category: "T-Shirts",
    collections: ["Everyday Basics"],
    tags: ["organic", "unisex"],
    images: TEE_IMAGES,
    options: COLOR_AND_SIZE,
    price: TEE_PRICE,
    weight: 180,
  },
  {
    handle: "lgtm-hoodie",
    sku: "DC-HOOD-LGTM",
    title: "LGTM Hoodie",
    subtitle: "Brushed-back fleece hoodie",
    description:
      "Looks good to me, says the hoodie. Heavy drawcord hood, kangaroo pocket, ribbed cuffs and hem.",
    category: "Sweatshirts & Hoodies",
    collections: ["Everyday Basics"],
    tags: ["new-arrival", "bestseller", "unisex"],
    images: SWEATSHIRT_IMAGES,
    options: [SIZE],
    price: HOODIE_PRICE,
    weight: 500,
  },
  {
    handle: "recursion-hoodie",
    sku: "DC-HOOD-RECURSE",
    title: "Recursion Hoodie",
    subtitle: "Brushed-back fleece hoodie",
    description:
      "See recursion hoodie. Boxy fit, heavy fleece, ribbed cuffs, no print on the back.",
    category: "Sweatshirts & Hoodies",
    collections: ["Everyday Basics"],
    tags: ["unisex"],
    images: SWEATSHIRT_IMAGES,
    options: [SIZE],
    price: HOODIE_PRICE,
    weight: 500,
  },
  {
    handle: "stack-overflow-crewneck",
    sku: "DC-CREW-STACK",
    title: "Stack Overflow Crewneck",
    subtitle: "Loopback cotton crewneck",
    description:
      "The crewneck you reach for when the answer was already accepted. Heavy loopback cotton with a set-in sleeve.",
    category: "Sweatshirts & Hoodies",
    collections: ["Everyday Basics"],
    tags: ["unisex"],
    images: SWEATSHIRT_IMAGES,
    options: [SIZE],
    price: CREWNECK_PRICE,
    weight: 480,
  },
  {
    handle: "null-pointer-sweatshirt",
    sku: "DC-SWEAT-NULL",
    title: "Null Pointer Sweatshirt",
    subtitle: "Loopback cotton sweatshirt",
    description:
      "Nothing here, on purpose. Heavyweight loopback cotton with a ribbed collar and cuffs.",
    category: "Sweatshirts & Hoodies",
    collections: ["Everyday Basics"],
    tags: ["organic", "unisex"],
    images: SWEATSHIRT_IMAGES,
    options: [SIZE],
    price: CREWNECK_PRICE,
    weight: 480,
  },
  {
    handle: "race-condition-hoodie",
    sku: "DC-HOOD-RACE",
    title: "Race Condition Hoodie",
    subtitle: "Brushed-back fleece hoodie",
    description:
      "Two threads, one winner, no particular order. Short run, printed once. Size XL is sold out.",
    category: "Sweatshirts & Hoodies",
    collections: ["Limited Run"],
    tags: ["new-arrival", "unisex"],
    images: SWEATSHIRT_IMAGES,
    options: [SIZE],
    price: HOODIE_PRICE,
    weight: 500,
    stock: 5,
    soldOut: ["XL"],
  },
  {
    handle: "sprint-joggers",
    sku: "DC-JOG-SPRINT",
    title: "Sprint Joggers",
    subtitle: "Tapered cotton blend joggers",
    description:
      "Built for the two weeks when everything is due. Elasticated waist, side pockets, tapered leg.",
    category: "Bottoms",
    collections: ["Everyday Basics"],
    tags: ["new-arrival", "unisex"],
    images: SWEATPANTS_IMAGES,
    options: [SIZE],
    price: JOGGER_PRICE,
    weight: 450,
  },
  {
    handle: "deploy-fatigue-sweatpants",
    sku: "DC-JOG-DEPLOY",
    title: "Deploy Fatigue Sweatpants",
    subtitle: "Heavyweight fleece sweatpants",
    description:
      "For the hours after the release window closes. Relaxed leg, elasticated cuffs, drawcord waist.",
    category: "Bottoms",
    collections: ["Everyday Basics"],
    tags: ["unisex"],
    images: SWEATPANTS_IMAGES,
    options: [SIZE],
    price: JOGGER_PRICE,
    weight: 450,
  },
  {
    handle: "rollback-joggers",
    sku: "DC-JOG-ROLLBACK",
    title: "Rollback Joggers",
    subtitle: "Tapered cotton blend joggers",
    description:
      "Undo everything, comfortably. Last run of this colourway, so sizes are limited.",
    category: "Bottoms",
    collections: ["Limited Run"],
    tags: ["last-chance", "unisex"],
    images: SWEATPANTS_IMAGES,
    options: [SIZE],
    price: JOGGER_PRICE,
    weight: 450,
    stock: 5,
  },
  {
    handle: "weekend-debug-shorts",
    sku: "DC-SHORT-WEEKEND",
    title: "Weekend Debug Shorts",
    subtitle: "Cotton twill shorts",
    description:
      "Cut short so you can sit cross-legged with a laptop. Drawcord waist, side seam pockets.",
    category: "Bottoms",
    collections: ["Everyday Basics"],
    tags: ["bestseller", "unisex"],
    images: SHORTS_IMAGES,
    options: [SIZE],
    price: SHORTS_PRICE,
    weight: 300,
  },
  {
    handle: "cache-miss-shorts",
    sku: "DC-SHORT-CACHE",
    title: "Cache Miss Shorts",
    subtitle: "Cotton twill shorts",
    description:
      "Short, fast and impossible to predict. Cotton twill, side seam pockets, single back pocket.",
    category: "Bottoms",
    collections: ["Everyday Basics"],
    tags: ["last-chance", "unisex"],
    images: SHORTS_IMAGES,
    options: [SIZE],
    price: SHORTS_PRICE,
    weight: 300,
  },
  {
    handle: "coffee-driven-development-mug",
    sku: "DC-MUG-CDD",
    title: "Coffee-Driven Development Mug",
    subtitle: "350 ml stoneware",
    description:
      "One job, done well: 350 ml of hot liquid next to a keyboard. Stoneware with a matte glaze, dishwasher safe.",
    category: "Desk",
    collections: ["Desk & Debug"],
    tags: ["bestseller"],
    images: MUG_IMAGES,
    options: [{ title: "Capacity", values: ["350 ml"] }],
    price: MUG_PRICE,
    weight: 400,
  },
  {
    handle: "kernel-panic-mug",
    sku: "DC-MUG-PANIC",
    title: "Kernel Panic Mug",
    subtitle: "350 ml stoneware",
    description:
      "The 350 ml stop-the-world event. Stoneware, matte glaze, dishwasher safe.",
    category: "Desk",
    collections: ["Desk & Debug"],
    tags: ["new-arrival"],
    images: MUG_IMAGES,
    options: [{ title: "Capacity", values: ["350 ml"] }],
    price: MUG_PRICE,
    weight: 400,
  },
  {
    handle: "rubber-duck-mug",
    sku: "DC-MUG-DUCK",
    title: "Rubber Duck Mug",
    subtitle: "350 ml stoneware",
    description:
      "Your most patient code reviewer, holding 350 ml. Stoneware with a matte glaze.",
    category: "Desk",
    collections: ["Desk & Debug"],
    tags: ["unisex"],
    images: MUG_IMAGES,
    options: [{ title: "Capacity", values: ["350 ml"] }],
    price: MUG_PRICE,
    weight: 400,
  },
  {
    handle: "first-build-kit",
    sku: "DC-KIT-FIRST",
    title: "First Build Kit",
    subtitle: "Tee and mug",
    description:
      "A tee and a mug for whoever just got their first build green. One box, two things, pick a tee size.",
    category: "Kits",
    collections: ["Desk & Debug"],
    tags: ["new-arrival", "unisex"],
    images: KIT_IMAGES,
    options: [SIZE],
    price: KIT_PRICE,
    weight: 800,
  },
  {
    handle: "onboarding-kit",
    sku: "DC-KIT-ONBOARD",
    title: "Onboarding Kit",
    subtitle: "Tee and mug",
    description:
      "Everything a new teammate needs on day one: a tee and a mug in one box. Pick a tee size.",
    category: "Kits",
    collections: ["Desk & Debug"],
    tags: ["unisex"],
    images: KIT_IMAGES,
    options: [SIZE],
    price: KIT_PRICE,
    weight: 800,
  },
  {
    handle: "hotfix-kit",
    sku: "DC-KIT-HOTFIX",
    title: "Hotfix Kit",
    subtitle: "Tee and mug",
    description:
      "Ship the fix, then sit down with the mug. Tee and mug, boxed, black only.",
    category: "Kits",
    collections: ["Desk & Debug", "Limited Run"],
    tags: ["new-arrival", "unisex"],
    images: KIT_IMAGES,
    options: [SIZE],
    price: KIT_PRICE,
    weight: 800,
    stock: 5,
  },

  // --- Wardrobe --------------------------------------------------------------
  // Real shots from the demo catalogue, so the shop reads like a shop rather
  // than the same four garments repeated. Sizes, stock and prices are ours.
  {
    handle: "blue-check-flannel-shirt",
    sku: "DC-SHI-BLUECHECKFLANN",
    title: "Blue Check Flannel Shirt",
    subtitle: "Brushed cotton flannel",
    description:
      "A proper flannel: brushed on both sides, cut straight, with a chest pocket that holds a phone and nothing else.",
    category: "Shirts",
    collections: ["Everyday Basics"],
    tags: ["new-arrival"],
    images: demoShots("mens-shirts/blue-&-black-check-shirt", 4),
    options: [SIZE],
    price: { eur: 32, usd: 36 },
    weight: 320,
  },
  {
    handle: "plaid-overshirt",
    sku: "DC-SHI-PLAIDOVERSHIRT",
    title: "Plaid Overshirt",
    subtitle: "Mid-weight overshirt",
    description:
      "Wear it open over a tee or closed on its own. Heavy enough to count as a jacket on a mild day.",
    category: "Shirts",
    collections: ["Everyday Basics"],
    tags: ["bestseller"],
    images: demoShots("mens-shirts/man-plaid-shirt", 4),
    options: [SIZE],
    price: { eur: 34, usd: 38 },
    weight: 380,
  },
  {
    handle: "short-sleeve-camp-shirt",
    sku: "DC-SHI-SHORTSLEEVECAM",
    title: "Short Sleeve Camp Shirt",
    subtitle: "Cotton poplin",
    description:
      "A boxy camp collar cut for warm rooms and long afternoons. Straight hem, worn untucked.",
    category: "Shirts",
    collections: ["Everyday Basics"],
    tags: ["new-arrival"],
    images: demoShots("mens-shirts/man-short-sleeve-shirt", 4),
    options: [SIZE],
    price: { eur: 22, usd: 24 },
    weight: 220,
  },
  {
    handle: "small-check-shirt",
    sku: "DC-SHI-SMALLCHECKSHIR",
    title: "Small Check Shirt",
    subtitle: "Cotton twill",
    description:
      "The quietest check in the shop. Button-down collar, single pocket, nothing to explain.",
    category: "Shirts",
    collections: ["Everyday Basics"],
    tags: ["organic"],
    images: demoShots("mens-shirts/men-check-shirt", 4),
    options: [SIZE],
    price: { eur: 27, usd: 30 },
    weight: 280,
  },
  {
    handle: "blue-midi-dress",
    sku: "DC-DRE-BLUEMIDIDRESS",
    title: "Blue Midi Dress",
    subtitle: "Cotton midi dress",
    description:
      "Dropped shoulders, side pockets, hem at mid-calf. The dress that survives a whole working day.",
    category: "Dresses",
    collections: ["Everyday Basics"],
    tags: ["new-arrival"],
    images: demoShots("tops/blue-frock", 4),
    options: [SIZE],
    price: { eur: 29, usd: 32 },
    weight: 300,
  },
  {
    handle: "summer-slip-dress",
    sku: "DC-DRE-SUMMERSLIPDRES",
    title: "Summer Slip Dress",
    subtitle: "Lightweight slip dress",
    description:
      "Thin straps and a straight neckline in a fabric that packs down to nothing.",
    category: "Dresses",
    collections: ["Everyday Basics"],
    tags: ["new-arrival"],
    images: demoShots("tops/girl-summer-dress", 4),
    options: [SIZE],
    price: { eur: 20, usd: 22 },
    weight: 200,
  },
  {
    handle: "grey-knit-dress",
    sku: "DC-DRE-GREYKNITDRESS",
    title: "Grey Knit Dress",
    subtitle: "Ribbed knit dress",
    description:
      "Holds its shape through a week of wear. Falls just below the knee, sleeves to the wrist.",
    category: "Dresses",
    collections: ["Everyday Basics"],
    tags: ["bestseller"],
    images: demoShots("tops/gray-dress", 4),
    options: [SIZE],
    price: { eur: 34, usd: 38 },
    weight: 350,
  },
  {
    handle: "short-a-line-dress",
    sku: "DC-DRE-SHORTALINEDRES",
    title: "Short A-Line Dress",
    subtitle: "A-line mini dress",
    description:
      "An A-line that flares from the shoulder rather than the waist, so it moves when you do.",
    category: "Dresses",
    collections: ["Everyday Basics"],
    tags: [],
    images: demoShots("tops/short-frock", 4),
    options: [SIZE],
    price: { eur: 24, usd: 27 },
    weight: 260,
  },
  {
    handle: "tartan-midi-dress",
    sku: "DC-DRE-TARTANMIDIDRES",
    title: "Tartan Midi Dress",
    subtitle: "Wool-blend tartan",
    description:
      "A small run in a tartan we will not weave again. Puffed sleeve, buttoned bodice, midi length.",
    category: "Dresses",
    collections: ["Limited Run"],
    tags: ["new-arrival","last-chance"],
    images: demoShots("tops/tartan-dress", 4),
    options: [SIZE],
    price: { eur: 38, usd: 42 },
    weight: 320,
    stock: 6,
  },
  {
    handle: "black-evening-gown",
    sku: "DC-DRE-BLACKEVENINGGO",
    title: "Black Evening Gown",
    subtitle: "Floor-length crepe gown",
    description:
      "One seam down the back, a slit to the knee, no other decoration. Made to be worn more than once.",
    category: "Dresses",
    collections: ["Limited Run"],
    tags: ["bestseller"],
    images: demoShots("womens-dresses/black-women's-gown", 4),
    options: [SIZE],
    price: { eur: 116, usd: 129 },
    weight: 600,
    stock: 6,
  },
  {
    handle: "leather-corset-and-skirt",
    sku: "DC-DRE-LEATHERCORSETA",
    title: "Leather Corset and Skirt",
    subtitle: "Leather two-piece",
    description:
      "Structured boning and a matching A-line skirt. Sold as a set, sized to be worn together.",
    category: "Dresses",
    collections: ["Limited Run"],
    tags: ["last-chance"],
    images: demoShots("womens-dresses/corset-leather-with-skirt", 4),
    options: [SIZE],
    price: { eur: 80, usd: 89 },
    weight: 700,
    stock: 4,
  },
  {
    handle: "corset-and-black-skirt",
    sku: "DC-DRE-CORSETANDBLACK",
    title: "Corset and Black Skirt",
    subtitle: "Corset and skirt set",
    description:
      "The same structured corset in black, with a plain skirt that works with the rest of the wardrobe.",
    category: "Dresses",
    collections: ["Limited Run"],
    tags: ["new-arrival"],
    images: demoShots("womens-dresses/corset-with-black-skirt", 4),
    options: [SIZE],
    price: { eur: 71, usd: 79 },
    weight: 650,
    stock: 5,
  },
  {
    handle: "pea-green-dress",
    sku: "DC-DRE-PEAGREENDRESS",
    title: "Pea Green Dress",
    subtitle: "Crepe day dress",
    description:
      "A soft green that reads neutral next to everything else in the shop. Short sleeve, knee length.",
    category: "Dresses",
    collections: ["Everyday Basics"],
    tags: ["organic"],
    images: demoShots("womens-dresses/dress-pea", 4),
    options: [SIZE],
    price: { eur: 44, usd: 49 },
    weight: 300,
  },
  {
    handle: "off-white-court-sneakers",
    sku: "DC-FOO-OFFWHITECOURTS",
    title: "Off-White Court Sneakers",
    subtitle: "Leather court sneaker",
    description:
      "A flat cupsole and a leather upper. Scuffs in well, cleans up well.",
    category: "Footwear",
    collections: ["Everyday Basics"],
    tags: ["bestseller"],
    images: demoShots("mens-shoes/sports-sneakers-off-white-&-red", 4),
    options: [SHOE_SIZES],
    price: { eur: 107, usd: 119 },
    weight: 900,
  },
  {
    handle: "red-runner-sneakers",
    sku: "DC-FOO-REDRUNNERSNEAK",
    title: "Red Runner Sneakers",
    subtitle: "Mesh runner",
    description:
      "Light enough for a commute, structured enough for a whole day on your feet.",
    category: "Footwear",
    collections: ["Everyday Basics"],
    tags: ["new-arrival"],
    images: demoShots("mens-shoes/sports-sneakers-off-white-red", 4),
    options: [SHOE_SIZES],
    price: { eur: 98, usd: 109 },
    weight: 850,
  },
  {
    handle: "gold-heeled-sandals",
    sku: "DC-FOO-GOLDHEELEDSAND",
    title: "Gold Heeled Sandals",
    subtitle: "Heeled sandal",
    description:
      "A low block heel and two straps. The pair that gets worn to the thing after work.",
    category: "Footwear",
    collections: ["Limited Run"],
    tags: [],
    images: demoShots("womens-shoes/golden-shoes-woman", 4),
    options: [SHOE_SIZES],
    price: { eur: 44, usd: 49 },
    weight: 600,
  },
  {
    handle: "red-leather-loafers",
    sku: "DC-FOO-REDLEATHERLOAF",
    title: "Red Leather Loafers",
    subtitle: "Leather loafer",
    description:
      "Unlined leather, a flexible sole, and a colour that does the talking.",
    category: "Footwear",
    collections: ["Everyday Basics"],
    tags: [],
    images: demoShots("womens-shoes/red-shoes", 4),
    options: [SHOE_SIZES],
    price: { eur: 31, usd: 34 },
    weight: 700,
  },
  {
    handle: "suede-mules",
    sku: "DC-FOO-SUEDEMULES",
    title: "Suede Mules",
    subtitle: "Suede backless mule",
    description:
      "Slips on, stays on. Suede upper on a stacked heel.",
    category: "Footwear",
    collections: ["Limited Run"],
    tags: ["new-arrival"],
    images: demoShots("womens-shoes/pampi-shoes", 4),
    options: [SHOE_SIZES],
    price: { eur: 26, usd: 29 },
    weight: 550,
  },
  {
    handle: "leather-slippers",
    sku: "DC-FOO-LEATHERSLIPPER",
    title: "Leather Slippers",
    subtitle: "Leather slipper",
    description:
      "Indoor shoes for the hours you would rather not put real shoes back on.",
    category: "Footwear",
    collections: ["Everyday Basics"],
    tags: [],
    images: demoShots("womens-shoes/black-&-brown-slipper", 4),
    options: [SHOE_SIZES],
    price: { eur: 17, usd: 19 },
    weight: 400,
  },
  {
    handle: "blue-shoulder-bag",
    sku: "DC-BAG-BLUESHOULDERBA",
    title: "Blue Shoulder Bag",
    subtitle: "Structured shoulder bag",
    description:
      "Holds a laptop, a charger and a paperback. One main compartment, one zip pocket, one strap that stays put.",
    category: "Bags",
    collections: ["Everyday Basics"],
    tags: ["new-arrival"],
    images: demoShots("womens-bags/blue-women's-handbag", 3),
    options: [{ title: "Color", values: ["Blue"] }],
    price: { eur: 44, usd: 49 },
    weight: 600,
  },
  {
    handle: "white-backpack",
    sku: "DC-BAG-WHITEBACKPACK",
    title: "White Backpack",
    subtitle: "Faux leather backpack",
    description:
      "Padded straps and a laptop sleeve behind a flap that closes with two magnets.",
    category: "Bags",
    collections: ["Everyday Basics"],
    tags: ["bestseller"],
    images: demoShots("womens-bags/white-faux-leather-backpack", 3),
    options: [{ title: "Color", values: ["White"] }],
    price: { eur: 35, usd: 39 },
    weight: 700,
  },
  {
    handle: "black-structured-tote",
    sku: "DC-BAG-BLACKSTRUCTURE",
    title: "Black Structured Tote",
    subtitle: "Structured tote",
    description:
      "Wide enough for a 16-inch laptop and stiff enough to stand up on its own.",
    category: "Bags",
    collections: ["Everyday Basics"],
    tags: ["unisex"],
    images: demoShots("womens-bags/women-handbag-black", 3),
    options: [{ title: "Color", values: ["Black"] }],
    price: { eur: 53, usd: 59 },
    weight: 750,
  },
  {
    handle: "black-acetate-sunglasses",
    sku: "DC-ACC-BLACKACETATESU",
    title: "Black Acetate Sunglasses",
    subtitle: "Acetate frame, UV400",
    description:
      "A thick acetate frame with lenses that cut the glare off a bright screen and a brighter street.",
    category: "Accessories",
    collections: ["Everyday Basics"],
    tags: ["bestseller"],
    images: demoShots("sunglasses/black-sun-glasses", 3),
    options: [{ title: "Color", values: ["Black"] }],
    price: { eur: 26, usd: 29 },
    weight: 120,
  },
  {
    handle: "classic-round-sunglasses",
    sku: "DC-ACC-CLASSICROUNDSU",
    title: "Classic Round Sunglasses",
    subtitle: "Metal frame, UV400",
    description:
      "Thin metal rims, round lenses, and a shape that has never needed updating.",
    category: "Accessories",
    collections: ["Everyday Basics"],
    tags: ["new-arrival"],
    images: demoShots("sunglasses/classic-sun-glasses", 3),
    options: [{ title: "Color", values: ["Silver"] }],
    price: { eur: 22, usd: 24 },
    weight: 100,
  },
  {
    handle: "green-frame-sunglasses",
    sku: "DC-ACC-GREENFRAMESUNG",
    title: "Green Frame Sunglasses",
    subtitle: "Acetate frame, UV400",
    description:
      "Bottle-green acetate with black lenses. Loud from the side, calm from the front.",
    category: "Accessories",
    collections: ["Limited Run"],
    tags: ["new-arrival"],
    images: demoShots("sunglasses/green-and-black-glasses", 3),
    options: [{ title: "Color", values: ["Green"] }],
    price: { eur: 31, usd: 34 },
    weight: 120,
  },
  {
    handle: "tinted-party-frames",
    sku: "DC-ACC-TINTEDPARTYFRA",
    title: "Tinted Party Frames",
    subtitle: "Tinted lenses",
    description:
      "Slim tinted frames for the evenings the sun is still up at nine.",
    category: "Accessories",
    collections: ["Limited Run"],
    tags: [],
    images: demoShots("sunglasses/party-glasses", 3),
    options: [{ title: "Color", values: ["Brown"] }],
    price: { eur: 17, usd: 19 },
    weight: 90,
  },
  {
    handle: "everyday-sunglasses",
    sku: "DC-ACC-EVERYDAYSUNGLA",
    title: "Everyday Sunglasses",
    subtitle: "Acetate frame, UV400",
    description:
      "The pair that lives in the bag. Light, flat, and cheap enough to lose once.",
    category: "Accessories",
    collections: ["Everyday Basics"],
    tags: [],
    images: demoShots("sunglasses/sunglasses", 3),
    options: [{ title: "Color", values: ["Tortoise"] }],
    price: { eur: 20, usd: 22 },
    weight: 100,
  },
  {
    handle: "green-crystal-earrings",
    sku: "DC-ACC-GREENCRYSTALEA",
    title: "Green Crystal Earrings",
    subtitle: "Crystal drop earrings",
    description:
      "Faceted green crystal on a short drop, light enough to forget you are wearing them.",
    category: "Accessories",
    collections: ["Limited Run"],
    tags: ["new-arrival"],
    images: demoShots("womens-jewellery/green-crystal-earring", 3),
    options: [{ title: "Color", values: ["Green"] }],
    price: { eur: 26, usd: 29 },
    weight: 40,
  },
  {
    handle: "oval-drop-earrings",
    sku: "DC-ACC-OVALDROPEARRIN",
    title: "Oval Drop Earrings",
    subtitle: "Oval drop earrings",
    description:
      "A single oval stone on a hook. Small enough for every day.",
    category: "Accessories",
    collections: ["Everyday Basics"],
    tags: [],
    images: demoShots("womens-jewellery/green-oval-earring", 3),
    options: [{ title: "Color", values: ["Green"] }],
    price: { eur: 22, usd: 24 },
    weight: 40,
  },
  {
    handle: "tropical-hoop-earrings",
    sku: "DC-ACC-TROPICALHOOPEA",
    title: "Tropical Hoop Earrings",
    subtitle: "Hoop earrings",
    description:
      "A palm-leaf hoop, plated and polished. Part of a short summer run.",
    category: "Accessories",
    collections: ["Limited Run"],
    tags: ["last-chance"],
    images: demoShots("womens-jewellery/tropical-earring", 3),
    options: [{ title: "Color", values: ["Gold"] }],
    price: { eur: 17, usd: 19 },
    weight: 30,
    stock: 5,
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

type PlannedVariant = {
  title: string
  sku: string
  options: Record<string, string>
  quantity: number
}

/**
 * One variant per combination of option values. Option order comes from the
 * catalogue, so titles and SKUs are stable across runs.
 */
function planVariants(item: CatalogueItem): PlannedVariant[] {
  let combinations: Record<string, string>[] = [{}]

  for (const option of item.options) {
    combinations = combinations.flatMap((combination) =>
      option.values.map((value) => ({ ...combination, [option.title]: value }))
    )
  }

  return combinations.map((combination) => {
    const title = Object.values(combination).join(" / ")
    const sku = [
      item.sku,
      ...Object.values(combination).map((value) =>
        value.toUpperCase().replace(/[^A-Z0-9]+/g, "-")
      ),
    ].join("-")

    return {
      title,
      sku,
      options: combination,
      quantity: item.soldOut?.includes(title)
        ? 0
        : item.stock ?? DEFAULT_STOCK,
    }
  })
}

/** Every variant the catalogue describes, keyed by SKU, for the stock pass. */
function planStock(): Map<string, number> {
  const stock = new Map<string, number>()

  for (const item of CATALOGUE) {
    for (const variant of planVariants(item)) {
      stock.set(variant.sku, variant.quantity)
    }
  }

  return stock
}

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

/**
 * Adds any payment provider the region is missing — this is what lets an
 * existing install pick Stripe up by adding `STRIPE_API_KEY` and re-running the
 * seed, instead of having to edit the region in the admin by hand. Providers
 * already on the region are kept, so nothing is ever taken away.
 */
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
    fields: ["id", "name"],
  })
  let stockLocationId = existing.find(
    (location) => location.name === STOCK_LOCATION_NAME
  )?.id

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
  const { data: sets } = await ctx.query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name"],
  })
  let fulfillmentSetId = sets.find(
    (set) => set.name === FULFILLMENT_SET_NAME
  )?.id

  if (!fulfillmentSetId) {
    const created = await ctx.container
      .resolve(Modules.FULFILLMENT)
      .createFulfillmentSets({
        name: FULFILLMENT_SET_NAME,
        type: "shipping",
        service_zones: [
          {
            name: REGION_NAME,
            geo_zones: COUNTRIES.map((country_code) => ({
              country_code,
              type: "country" as const,
            })),
          },
        ],
      })

    fulfillmentSetId = created.id
    ctx.logger.info(`Created fulfillment set "${FULFILLMENT_SET_NAME}".`)
  }

  const { data: setsWithZones } = await ctx.query.graph({
    entity: "fulfillment_set",
    fields: ["id", "service_zones.id"],
    filters: { id: fulfillmentSetId },
  })
  const serviceZoneId = setsWithZones[0]?.service_zones?.[0]?.id

  if (!serviceZoneId) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Fulfillment set ${fulfillmentSetId} has no service zone.`
    )
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
    fields: ["id", "name"],
  })
  const missing = SHIPPING_OPTIONS.filter(
    (option) =>
      !data.some((existing: { name: string }) => existing.name === option.name)
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

// --- Catalogue reference data ------------------------------------------------

type CatalogueRefs = {
  salesChannelId: string
  shippingProfileId: string
  categories: Map<string, string>
  collections: Map<string, string>
  tags: Map<string, string>
  sharedOptions: Map<string, string>
  /** The values each shared option already has, so a product is only linked to
   * one when that option can actually express the product's values. */
  sharedOptionValues: Map<string, Set<string>>
}

async function ensureCatalogueRefs(
  ctx: SeedContext,
  salesChannelId: string,
  shippingProfileId: string
): Promise<CatalogueRefs> {
  const { data: categories } = await ctx.query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })
  const missingCategories = CATEGORIES.filter(
    (category) =>
      !categories.some(
        (existing: { name: string }) => existing.name === category.name
      )
  )

  if (missingCategories.length) {
    await createProductCategoriesWorkflow(ctx.container).run({
      input: {
        product_categories: missingCategories.map((category) => ({
          name: category.name,
          handle: category.handle,
          is_active: true,
        })),
      },
    })
    ctx.logger.info(`Created ${missingCategories.length} category(ies).`)
  }

  const { data: collections } = await ctx.query.graph({
    entity: "product_collection",
    fields: ["id", "title"],
  })
  const missingCollections = COLLECTIONS.filter(
    (collection) =>
      !collections.some(
        (existing: { title: string }) => existing.title === collection.title
      )
  )

  if (missingCollections.length) {
    await createCollectionsWorkflow(ctx.container).run({
      input: { collections: missingCollections },
    })
    ctx.logger.info(`Created ${missingCollections.length} collection(s).`)
  }

  const { data: tags } = await ctx.query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
  })
  const missingTags = TAGS.filter(
    (tag) => !tags.some((existing: { value: string }) => existing.value === tag)
  )

  if (missingTags.length) {
    await createProductTagsWorkflow(ctx.container).run({
      input: { product_tags: missingTags.map((value) => ({ value })) },
    })
    ctx.logger.info(`Created ${missingTags.length} tag(s).`)
  }

  const { data: options } = await ctx.query.graph({
    entity: "product_option",
    fields: ["id", "title", "is_exclusive"],
    filters: { is_exclusive: false },
  })
  const missingOptions = SHARED_OPTIONS.filter(
    (option) =>
      !options.some((existing: { title: string }) => existing.title === option.title)
  )

  if (missingOptions.length) {
    await createProductOptionsWorkflow(ctx.container).run({
      input: {
        product_options: missingOptions.map((option) => ({
          ...option,
          is_exclusive: false,
        })),
      },
    })
    ctx.logger.info(`Created ${missingOptions.length} shared option(s).`)
  }

  const { data: allCategories } = await ctx.query.graph({
    entity: "product_category",
    fields: ["id", "name"],
  })
  const { data: allCollections } = await ctx.query.graph({
    entity: "product_collection",
    fields: ["id", "title"],
  })
  const { data: allTags } = await ctx.query.graph({
    entity: "product_tag",
    fields: ["id", "value"],
  })
  const { data: allOptions } = await ctx.query.graph({
    entity: "product_option",
    fields: ["id", "title", "values.value"],
    filters: { is_exclusive: false },
  })

  return {
    salesChannelId,
    shippingProfileId,
    categories: new Map<string, string>(
      allCategories.map(
        (row: { name: string; id: string }) => [row.name, row.id] as [string, string]
      )
    ),
    collections: new Map<string, string>(
      allCollections.map(
        (row: { title: string; id: string }) =>
          [row.title, row.id] as [string, string]
      )
    ),
    tags: new Map<string, string>(
      allTags.map(
        (row: { value: string; id: string }) => [row.value, row.id] as [string, string]
      )
    ),
    sharedOptions: new Map<string, string>(
      allOptions.map(
        (row: { title: string; id: string }) =>
          [row.title, row.id] as [string, string]
      )
    ),
    sharedOptionValues: new Map<string, Set<string>>(
      allOptions.map(
        (row: { title: string; values?: { value: string }[] }) =>
          [
            row.title,
            new Set((row.values ?? []).map((value) => value.value)),
          ] as [string, Set<string>]
      )
    ),
  }
}

/**
 * Deletes the starter's placeholder products. Skipped when the store has any
 * order, because order history should never be touched by a seed script.
 */
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

/**
 * The starter's own categories, which the catalogue does not use. Only removed
 * once no live product points at them, so nothing is left dangling — and never
 * when the catalogue has taken the handle over (`shirts` is both the starter's
 * placeholder and this store's own Shirts category).
 */
async function removeLegacyCategories(ctx: SeedContext) {
  const legacyHandles = LEGACY_CATEGORY_HANDLES.filter(
    (handle) => !CATEGORIES.some((category) => category.handle === handle)
  )
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

async function ensureProducts(
  ctx: SeedContext,
  refs: CatalogueRefs,
  currencyCodes: string[]
) {
  const { data: existing } = await ctx.query.graph({
    entity: "product",
    fields: ["id", "handle", "categories.id", "sales_channels.id"],
  })
  const taken = new Set(
    existing.map((product: { handle: string }) => product.handle)
  )
  const missing = CATALOGUE.filter((item) => !taken.has(item.handle))

  // A catalogue product that lost its category (a deleted category, a manual
  // edit) is put back into the one this file names, and one that lost every
  // sales channel is put back into this store's channel — a product with no
  // channel is invisible in the storefront and in search. Only an empty list is
  // repaired, so an admin's own filing survives a re-run.
  const rows = existing as {
    id: string
    handle: string
    categories?: unknown[]
    sales_channels?: unknown[]
  }[]
  const byHandle = new Map(rows.map((row) => [row.handle, row]))

  type ProductRepair = {
    id: string
    category_ids?: string[]
    sales_channels?: { id: string }[]
  }

  const repairs: { handle: string; fix: ProductRepair }[] = []

  for (const item of CATALOGUE) {
    const row = byHandle.get(item.handle)

    if (!row) continue

    const fix: ProductRepair = { id: row.id }
    const categoryId = refs.categories.get(item.category)

    if (!row.categories?.length && categoryId) {
      fix.category_ids = [categoryId]
    }

    if (!row.sales_channels?.length) {
      fix.sales_channels = [{ id: refs.salesChannelId }]
    }

    if (fix.category_ids ?? fix.sales_channels) {
      repairs.push({ handle: item.handle, fix })
    }
  }

  if (repairs.length) {
    await updateProductsWorkflow(ctx.container).run({
      input: { products: repairs.map((repair) => repair.fix) },
    })
    ctx.logger.info(
      `Repaired ${repairs.length} product(s) that had lost their category or sales channel: ${repairs
        .map((repair) => repair.handle)
        .join(", ")}.`
    )
  }

  if (!missing.length) {
    ctx.logger.info("Every catalogue product already exists.")
    return
  }

  const products: CreateProductDTO[] = missing.map((item) => ({
    title: item.title,
    subtitle: item.subtitle,
    description: item.description,
    handle: item.handle,
    status: ProductStatus.PUBLISHED,
    thumbnail: item.images[0],
    images: item.images.map((url) => ({ url })),
    weight: item.weight,
    shipping_profile_id: refs.shippingProfileId,
    collection_id: item.collections
      .map((title) => refs.collections.get(title))
      .find((id): id is string => Boolean(id)),
    category_ids: [refs.categories.get(item.category)].filter(
      (id): id is string => Boolean(id)
    ),
    tag_ids: item.tags
      .map((tag) => refs.tags.get(tag))
      .filter((id): id is string => Boolean(id)),
    sales_channels: [{ id: refs.salesChannelId }],
    // A shared option is linked by id so the storefront's option filter keeps
    // working, but only when it can hold every value this product needs — a bag
    // in `Blue` cannot hang off a shared `Color` that only knows Black and
    // White. Anything else is created for this product alone.
    options: item.options.map((option) => {
      const sharedId = refs.sharedOptions.get(option.title)
      const sharedValues = refs.sharedOptionValues.get(option.title)
      const fitsShared =
        sharedId !== undefined &&
        option.values.every((value) => sharedValues?.has(value))

      return fitsShared
        ? { id: sharedId }
        : { title: option.title, values: option.values, is_exclusive: true }
    }),
    variants: planVariants(item).map((variant) => ({
      title: variant.title,
      sku: variant.sku,
      options: variant.options,
      prices: currencyCodes.map((currency_code) => ({
        currency_code,
        amount: item.price[currency_code],
      })),
    })),
  }))

  // Batched so one bad product cannot roll the whole catalogue back.
  const BATCH_SIZE = 8

  for (let start = 0; start < products.length; start += BATCH_SIZE) {
    await createProductsWorkflow(ctx.container).run({
      input: { products: products.slice(start, start + BATCH_SIZE) },
    })
    ctx.logger.info(
      `Created ${Math.min(start + BATCH_SIZE, products.length)}/${products.length} product(s).`
    )
  }
}

async function ensureInventoryLevels(
  ctx: SeedContext,
  stockLocationId: string
) {
  const { data: items } = await ctx.query.graph({
    entity: "inventory_item",
    fields: ["id", "sku", "location_levels.location_id"],
  })
  const stock = planStock()
  const missing = items.filter(
    (item) =>
      !(item.location_levels ?? []).some(
        (level) => level?.location_id === stockLocationId
      )
  )

  if (!missing.length) {
    ctx.logger.info("Inventory levels already exist for every variant.")
    return
  }

  await createInventoryLevelsWorkflow(ctx.container).run({
    input: {
      inventory_levels: missing.map(
        (item: { id: string; sku?: string | null }) => ({
          location_id: stockLocationId,
          inventory_item_id: item.id,
          stocked_quantity: stock.get(item.sku ?? "") ?? DEFAULT_STOCK,
        })
      ),
    },
  })

  ctx.logger.info(`Created ${missing.length} inventory level(s).`)
}

/**
 * A fresh database has a migrated but not-yet-active search index; replaying
 * events into it fails. Medusa's supported reindex API handles both that first
 * seed and a later full rebuild, including products deleted by this script.
 */
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

/**
 * The event subscriber runs as products change. On a fresh install, seed the
 * empty/starter index first so those events do not race an index with no active
 * version. The final reindex then catches every write and deletion in the run.
 */
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

/**
 * Creates the demo promotion codes that are missing. An existing code is left
 * untouched: it may have been edited or deactivated in the admin, and a seed
 * run should not undo that.
 */
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

  const refs = await ensureCatalogueRefs(ctx, salesChannelId, shippingProfileId)
  await ensureSearchIndexReady(ctx)
  await removeLegacyProducts(ctx)
  await removeLegacyCategories(ctx)

  await ensureProducts(ctx, refs, currencyCodes)
  await ensureInventoryLevels(ctx, stockLocationId)
  await ensurePromotions(ctx)
  await reindexSearch(ctx)

  ctx.logger.info(
    `Done. ${CATALOGUE.length} DevCart products across ${CATEGORIES.length} categories and ${COLLECTIONS.length} collections.`
  )
}
