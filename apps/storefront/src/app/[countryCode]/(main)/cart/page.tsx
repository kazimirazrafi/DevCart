import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { listVariantAvailability } from "@lib/data/products"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "Review the items in your cart.",
  // A cart is a per-visitor state, not a page worth indexing.
  robots: { index: false, follow: false },
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  /*
   * The cart holds quantities but not stock, so the caps and warnings on the
   * line items are resolved from the products those lines point at. A failure
   * here leaves the map empty and the cart renders anyway.
   */
  const productIds =
    cart?.items
      ?.map((item) => item.product_id)
      .filter((id): id is string => Boolean(id)) ?? []

  const availability = cart?.region_id
    ? await listVariantAvailability({ productIds, regionId: cart.region_id })
    : {}

  return (
    <CartTemplate
      cart={cart}
      customer={customer}
      availability={availability}
    />
  )
}
