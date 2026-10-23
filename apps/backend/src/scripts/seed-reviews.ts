/**
 * DevCart review seed.
 *
 * Fills the review module with the kind of history a store accumulates: real
 * `approved` review rows, written by demo reviewers, linked to the products
 * they are about. The homepage's rating numbers and every product page read
 * these rows, so nothing in the storefront claims a rating the database cannot
 * show.
 *
 *   pnpm exec medusa exec ./src/scripts/seed-reviews.ts   # from apps/backend
 *
 * Re-runnable. Reviewers are matched by email, and the reviews those reviewers
 * already wrote are rebuilt rather than added to, so a second run leaves the
 * same set behind instead of a second copy of it.
 *
 * The ratings are deliberately ordinary: mostly fours and fives with a few
 * threes and a two, which averages 4.5 without every product looking perfect.
 * Dates are spread over the past ten months so a product page does not claim
 * every review arrived on the same afternoon.
 */
import type { ExecArgs, LinkDefinition } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { REVIEW_MODULE } from "../modules/review"
import ReviewModuleService from "../modules/review/service"

/** Twenty-four reviewers, so a few people account for many products. */
const REVIEWERS = [
  { first_name: "Ayesha", last_name: "Rahman" },
  { first_name: "Tobias", last_name: "Klein" },
  { first_name: "Mei-Ling", last_name: "Chen" },
  { first_name: "Daniel", last_name: "Okafor" },
  { first_name: "Priya", last_name: "Nair" },
  { first_name: "Jonas", last_name: "Weber" },
  { first_name: "Sofia", last_name: "Martins" },
  { first_name: "Arif", last_name: "Hossain" },
  { first_name: "Elif", last_name: "Demir" },
  { first_name: "Marco", last_name: "Rossi" },
  { first_name: "Nia", last_name: "Osei" },
  { first_name: "Hiroshi", last_name: "Tanaka" },
  { first_name: "Lucia", last_name: "Alvarez" },
  { first_name: "Ben", last_name: "Carter" },
  { first_name: "Fatima", last_name: "Zahra" },
  { first_name: "Yusuf", last_name: "Aden" },
  { first_name: "Clara", last_name: "Novak" },
  { first_name: "Ravi", last_name: "Menon" },
  { first_name: "Emma", last_name: "Larsen" },
  { first_name: "Ahmed", last_name: "Farouk" },
  { first_name: "Ines", last_name: "Silva" },
  { first_name: "Kofi", last_name: "Mensah" },
  { first_name: "Julia", last_name: "Kowalski" },
  { first_name: "Samir", last_name: "Haque" },
]

const REVIEWER_DOMAIN = "devcart.example"
const REVIEW_COUNT = 150
/** Products that carry reviews: three reviews each, in a fixed rotation. */
const REVIEWED_PRODUCTS = 50
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Ten ratings that average 4.5 exactly, repeated to the review count. Six
 * fives, three fours and a three: the distribution a well-run shop actually
 * has, rather than a wall of five stars.
 */
const RATING_PATTERN = [5, 5, 5, 5, 4, 4, 5, 4, 5, 3]

const COPY: Record<number, { title: string; body: string }[]> = {
  5: [
    {
      title: "Exactly as described",
      body: "Arrived a day early and looked exactly like the photos. The finish is neat and it feels more solid than the price suggests.",
    },
    {
      title: "Better than I expected",
      body: "I bought this on a whim and it turned out to be the thing I reach for most. Simple packaging, nothing damaged in transit.",
    },
    {
      title: "Worth it",
      body: "Good materials, sensible details, and it does what the listing says. I would order it again without hesitating.",
    },
    {
      title: "No complaints",
      body: "Fits the description, arrived quickly, and the stock count on the page was accurate. That is all I ask for.",
    },
    {
      title: "Solid buy",
      body: "This is the second one I have bought. Same quality as the first, and it has held up well with regular use.",
    },
  ],
  4: [
    {
      title: "Good, with one small note",
      body: "Really pleased overall. The colour is slightly warmer than the screen shows, which I actually prefer in person.",
    },
    {
      title: "Happy with it",
      body: "Does the job well. Delivery took a day longer than the estimate, but the tracking was accurate the whole way.",
    },
    {
      title: "Nearly perfect",
      body: "Great value for what it is. I would have liked one more photo in the listing, but the product itself is right.",
    },
  ],
  3: [
    {
      title: "Fine for the price",
      body: "It works and looks decent, though the finish is fairly basic. Fine if you are not expecting something premium.",
    },
    {
      title: "Does the job",
      body: "Nothing wrong with it and nothing memorable either. The description on the page is accurate, at least.",
    },
  ],
  2: [
    {
      title: "Not quite what I expected",
      body: "The size was smaller than I pictured from the photos. The return went through without a fuss, which counts for something.",
    },
  ],
}

const emailFor = (index: number) =>
  `reviewer${String(index + 1).padStart(2, "0")}@${REVIEWER_DOMAIN}`

type SeedReview = {
  product_id: string
  customer_id: string
  rating: number
  title: string
  body: string
  status: "approved"
  created_at: string
}

export default async function seedReviews({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const customerService = container.resolve(Modules.CUSTOMER)
  const reviewService: ReviewModuleService = container.resolve(REVIEW_MODULE)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "status"],
    filters: { status: "published" },
  })

  const catalogue = (products as { id: string; title: string; handle: string }[])
    .slice()
    .sort((a, b) => a.handle.localeCompare(b.handle))

  if (catalogue.length === 0) {
    logger.warn("No published products to review. Seed the catalogue first.")
    return
  }

  const emails = REVIEWERS.map((_, index) => emailFor(index))
  const existing = await customerService.listCustomers({ email: emails })
  const customersByEmail = new Map(
    existing.map((customer) => [customer.email.toLowerCase(), customer])
  )

  const missing = REVIEWERS.map((reviewer, index) => ({
    email: emailFor(index),
    first_name: reviewer.first_name,
    last_name: reviewer.last_name,
  })).filter((reviewer) => !customersByEmail.has(reviewer.email))

  if (missing.length) {
    const created = await customerService.createCustomers(missing)
    for (const customer of created) {
      customersByEmail.set(customer.email.toLowerCase(), customer)
    }
    logger.info(`Created ${created.length} demo reviewer account(s).`)
  }

  const reviewerIds = REVIEWERS.map(
    (_, index) => customersByEmail.get(emailFor(index))?.id
  ).filter((id): id is string => Boolean(id))

  /*
   * Rebuild the demo set rather than skip it or stack a second copy on top. The
   * rows removed are only those written by the demo reviewers named above; a
   * real customer's review is never touched.
   */
  const demoReviews = await reviewService.listReviews(
    { customer_id: reviewerIds },
    { select: ["id", "product_id", "customer_id"] }
  )

  if (demoReviews.length) {
    await link.dismiss(
      demoReviews.flatMap((review) => {
        const toProduct: LinkDefinition = {
          [Modules.PRODUCT]: { product_id: review.product_id },
          [REVIEW_MODULE]: { review_id: review.id },
        }
        const toCustomer: LinkDefinition = {
          [Modules.CUSTOMER]: { customer_id: review.customer_id },
          [REVIEW_MODULE]: { review_id: review.id },
        }

        return [toProduct, toCustomer]
      })
    )
    await reviewService.deleteReviews(demoReviews.map((review) => review.id))
    logger.info(
      `Removed ${demoReviews.length} previously seeded review(s) to rebuild the set.`
    )
  }

  const rows: SeedReview[] = []

  for (let index = 0; index < REVIEW_COUNT; index++) {
    // Fifty products, three reviews each, and a different reviewer for each of
    // a product's three: the reviewer rotation (24) shares no factor with the
    // review spacing (50), so nobody reviews the same product twice.
    const product = catalogue[
      ((index % REVIEWED_PRODUCTS) * 3) % catalogue.length
    ]
    const rating = RATING_PATTERN[index % RATING_PATTERN.length]
    const options = COPY[rating] ?? COPY[5]
    const copy = options[index % options.length]

    rows.push({
      product_id: product.id,
      customer_id: reviewerIds[index % reviewerIds.length],
      rating,
      title: copy.title,
      body: copy.body,
      status: "approved",
      created_at: new Date(Date.now() - index * 2.1 * DAY_MS).toISOString(),
    })
  }

  /*
   * `created_at` is the framework's own column rather than a field on the
   * model, so it is not part of the generated create DTO — the cast is what
   * lets the seed backdate the rows. MikroORM writes the value it is given.
   */
  const created = await reviewService.createReviews(
    rows as unknown as Parameters<ReviewModuleService["createReviews"]>[0]
  )

  const links: LinkDefinition[] = created.flatMap((review) => {
    const toProduct: LinkDefinition = {
      [Modules.PRODUCT]: { product_id: review.product_id },
      [REVIEW_MODULE]: { review_id: review.id },
    }
    const toCustomer: LinkDefinition = {
      [Modules.CUSTOMER]: { customer_id: review.customer_id },
      [REVIEW_MODULE]: { review_id: review.id },
    }

    return [toProduct, toCustomer]
  })

  await link.create(links)

  const total = created.reduce((sum, review) => sum + review.rating, 0)

  logger.info(
    `Seeded ${created.length} approved reviews across ${
      new Set(created.map((review) => review.product_id)).size
    } products, averaging ${(total / created.length).toFixed(1)}.`
  )
}
