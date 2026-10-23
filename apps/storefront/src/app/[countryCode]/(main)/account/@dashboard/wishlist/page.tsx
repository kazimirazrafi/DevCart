import { Metadata } from "next"
import { notFound } from "next/navigation"

import { listProducts } from "@lib/data/products"
import { retrieveCustomer } from "@lib/data/customer"
import { listWishlist } from "@lib/data/wishlist"
import { getProductPrice } from "@lib/util/get-product-price"
import { Rule } from "@modules/design-system"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductCard from "@modules/products/components/product-card"
import PreviewPrice from "@modules/products/components/product-preview/price"
import WishlistButton from "@modules/products/components/wishlist-button"

export const metadata: Metadata = {
  title: "Wishlist",
  description: "Products you have saved for later.",
  robots: { index: false, follow: false },
}

/**
 * The customer's saved products.
 *
 * The rows come from the wishlist module and the prices from the catalogue, in
 * the region being browsed: the Store API's price is a region calculation, so
 * the list is read for ids and the products for everything else. A saved id
 * whose product is no longer published is not in the second read and simply is
 * not shown — the save stays, because the product may come back.
 *
 * Saved with a variant, the plate says which one, so the customer can tell two
 * saves of the same product apart. The heart here refreshes the route when it
 * changes something, because on this page a removal has to take the plate away.
 */
export default async function WishlistPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const customer = await retrieveCustomer()

  if (!customer) {
    notFound()
  }

  const entries = await listWishlist()
  const ids = Array.from(new Set(entries.map((entry) => entry.product_id)))

  const products = new Map(
    ids.length
      ? (
          await listProducts({
            countryCode,
            // Live: a save the customer just removed must not be drawn from a
            // cached listing on the way back to this page.
            cache: "no-store",
            queryParams: { id: ids, limit: 100 },
          })
        ).response.products.map((product) => [product.id, product])
      : []
  )

  return (
    <div className="w-full" data-testid="wishlist-page-wrapper">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-h1 font-bold text-ink">Wishlist</h1>
        <p className="max-w-prose text-body text-ink/80">
          Products you have saved. The heart on any product saves it here, and
          the one on a plate below takes it off the list.
        </p>
      </div>

      <Rule weight="heavy" className="mt-4" />

      {entries.length === 0 ? (
        <p
          className="max-w-prose py-10 text-body text-ink/80"
          data-testid="wishlist-empty"
        >
          Nothing saved yet.{" "}
          <LocalizedClientLink
            href="/store"
            className="underline underline-offset-4 hover:text-riso-blue"
          >
            Browse the shop
          </LocalizedClientLink>{" "}
          and tap the heart on anything you want to come back to.
        </p>
      ) : (
        <ul
          className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 small:grid-cols-3 small:gap-x-6"
          data-testid="wishlist-list"
        >
          {entries.map((entry) => {
            const product = products.get(entry.product_id)

            if (!product) {
              return null
            }

            const { cheapestPrice, variantPrice } = getProductPrice({
              product,
              variantId: entry.variant_id ?? undefined,
            })
            const price = variantPrice ?? cheapestPrice
            const variant = entry.variant_id
              ? product.variants?.find((item) => item.id === entry.variant_id)
              : undefined

            return (
              <li
                key={entry.id}
                className="relative"
                data-testid="wishlist-item"
              >
                <ProductCard
                  href={`/products/${product.handle}`}
                  title={product.title ?? "Untitled product"}
                  thumbnail={product.thumbnail}
                  price={price ? <PreviewPrice price={price} /> : null}
                  meta={
                    variant ? <span>Saved size: {variant.title}</span> : null
                  }
                />

                <WishlistButton
                  productId={product.id}
                  variantId={entry.variant_id}
                  initialEntry={{ id: entry.id }}
                  withLabel
                  refreshOnChange
                  className="absolute right-2 top-2 z-10"
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
