import { Metadata } from "next"

import { listCategories } from "@lib/data/categories"
import { listCollections } from "@lib/data/collections"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getCatalogueReviewSummary } from "@lib/data/reviews"
import { pageMetadata } from "@lib/util/seo"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import AnnouncementBar from "@modules/home/components/announcement-bar"
import BrandStory from "@modules/home/components/brand-story"
import CollectionRail from "@modules/home/components/collection-rail"
import { Department } from "@modules/home/components/department-grid"
import DepartmentGrid from "@modules/home/components/department-grid"
import Faq from "@modules/home/components/faq"
import Hero from "@modules/home/components/hero"
import Newsletter from "@modules/home/components/newsletter"
import ReviewHighlights from "@modules/home/components/review-highlights"
import TrustBar from "@modules/home/components/trust-bar"

/*
 * No title on purpose: the root layout's default (the store's own strapline)
 * is a better search result for the homepage than "Home | DevCart".
 */
export async function generateMetadata(props: {
  params: Promise<{ countryCode: string }>
}): Promise<Metadata> {
  const { countryCode } = await props.params

  return pageMetadata({
    countryCode,
    description:
      "DevCart is a full department store: electronics, fashion, beauty, home and groceries, stocked in small quantities and shipped from one warehouse.",
  })
}

/** The three collections the homepage gives a row to, in order. */
const RAIL_HANDLES = [
  { handle: "best-sellers", title: "Best sellers" },
  { handle: "new-arrivals", title: "New arrivals" },
  { handle: "tech-essentials", title: "Tech essentials" },
]

/** Products per rail. Enough to scroll, few enough to keep the page light. */
const RAIL_SIZE = 8

/** The catalogue is read two pages at a time to count each department. */
const PRODUCTS_PER_PAGE = 100

/** Products the review rail has room for. */
const REVIEW_LIMIT = 3

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  try {
    const region = await getRegion(countryCode)

    if (!region) {
      return (
        <HomeError message="This country is not available yet. Choose another region from the menu." />
      )
    }

    const [
      categories,
      { collections },
      newest,
      firstPage,
      secondPage,
      reviewSummary,
    ] = await Promise.all([
        listCategories({
          limit: 100,
          fields: "id, name, handle, parent_category_id, *category_children",
        }),
        listCollections({ fields: "id, handle, title" }),
        listProducts({
          countryCode,
          queryParams: {
            limit: 1,
            order: "-created_at",
            fields: "id, title, handle, thumbnail",
          },
        }).then(({ response }) => response.products[0]),
        listProducts({
          countryCode,
          queryParams: {
            limit: PRODUCTS_PER_PAGE,
            fields: "id, +metadata, *categories",
          },
        }).then(({ response }) => response),
        listProducts({
          countryCode,
          queryParams: {
            limit: PRODUCTS_PER_PAGE,
            offset: PRODUCTS_PER_PAGE,
            fields: "id, +metadata, *categories",
          },
        }).then(({ response }) => response),
        getCatalogueReviewSummary(),
      ])

    const catalogue = [...firstPage.products, ...secondPage.products]
    // `count` is the whole matching catalogue, not the page, so the first read
    // already knows how many products the shop holds.
    const productCount = firstPage.count

    /*
     * The review rail is the products whose published reviews put them highest,
     * read back from the catalogue so the card keeps its price and picture. The
     * summary is already the source of truth for the numbers next to them.
     */
    const reviewProductIds = reviewSummary.products
      .slice(0, REVIEW_LIMIT)
      .map((rated) => rated.product_id)

    const reviewedProducts = reviewProductIds.length
      ? (
          await listProducts({
            countryCode,
            queryParams: {
              id: reviewProductIds,
              limit: reviewProductIds.length,
              fields: "*variants.calculated_price",
            },
          })
        ).response.products
      : []

    const reviewedById = new Map(
      reviewedProducts.map((product) => [product.id, product])
    )

    const reviewHighlights = reviewSummary.products
      .map((rated) => {
        const product = reviewedById.get(rated.product_id)

        return product
          ? { product, rating: rated.average, reviewCount: rated.count }
          : null
      })
      .filter(
        (
          entry
        ): entry is NonNullable<typeof entry> => entry !== null
      )
      .slice(0, REVIEW_LIMIT)

    const departmentNames = new Set(
      categories
        .filter((category) => !category.parent_category_id)
        .map((category) => category.name)
        .filter((name): name is string => Boolean(name))
    )

    const productsPerDepartment = new Map<string, number>()
    for (const product of catalogue) {
      for (const category of product.categories ?? []) {
        const name = category?.name
        if (name && departmentNames.has(name)) {
          productsPerDepartment.set(
            name,
            (productsPerDepartment.get(name) ?? 0) + 1
          )
        }
      }
    }

    const departments: Department[] = categories
      .filter((category) => !category.parent_category_id && category.handle)
      .map((category) => ({
        id: category.id,
        name: category.name ?? "Department",
        handle: category.handle as string,
        children: (category.category_children ?? [])
          .filter((child) => Boolean(child.handle))
          .map((child) => ({
            id: child.id,
            name: child.name ?? "",
            handle: child.handle as string,
          })),
        productCount: productsPerDepartment.get(category.name ?? "") ?? 0,
      }))

    const rails = await Promise.all(
      RAIL_HANDLES.map(async (rail) => {
        const collection = collections.find(
          (candidate) => candidate.handle === rail.handle
        )

        if (!collection) {
          return { ...rail, collection: null, products: [] }
        }

        const { response } = await listProducts({
          countryCode,
          queryParams: { collection_id: [collection.id], limit: RAIL_SIZE },
        })

        return { ...rail, collection, products: response.products }
      })
    )

    return (
      <>
        <AnnouncementBar />
        <Hero product={newest} />
        <TrustBar
          productCount={productCount}
          averageRating={reviewSummary.average}
          reviewCount={reviewSummary.count}
        />
        <DepartmentGrid departments={departments} />

        {rails.map((rail) =>
          rail.collection ? (
            <CollectionRail
              key={rail.handle}
              id={rail.handle}
              title={rail.title}
              href={`/collections/${rail.collection.handle}`}
              products={rail.products}
              region={region}
              eager={rail.handle === "best-sellers"}
            />
          ) : null
        )}

        <BrandStory />

        <ReviewHighlights
          items={reviewHighlights}
          averageRating={reviewSummary.average}
          reviewCount={reviewSummary.count}
        />

        <Faq />

        <Newsletter />
      </>
    )
  } catch (error) {
    console.error("Failed to load the DevCart homepage", error)

    return (
      <HomeError message="The catalogue could not be loaded. Refresh the page to try again." />
    )
  }
}

function HomeError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="content-container border-b border-ink/20 py-16 small:py-24"
    >
      <h1 className="font-display text-h1 font-bold">The store is unavailable</h1>
      <p className="mt-3 max-w-prose text-ink/75">{message}</p>
      <LocalizedClientLink
        href="/store"
        className="mt-5 inline-flex text-riso-blue underline underline-offset-4"
      >
        Browse all products
      </LocalizedClientLink>
    </div>
  )
}
