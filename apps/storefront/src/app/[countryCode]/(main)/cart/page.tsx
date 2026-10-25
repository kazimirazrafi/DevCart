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

  // Cart lines carry no stock, so the caps are resolved from their products; a
  // failed read leaves the map empty and the cart still renders.
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
