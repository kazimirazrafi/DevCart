import { expect, test } from "@playwright/test"

import {
  addAProductToCart,
  completeAddressStep,
  completeDeliveryStep,
  completeGuestContactStep,
  completePaymentStep,
  goToCheckoutFromCart,
  pathsFor,
  placeOrder,
  resolveCountry,
  testCards,
  uniqueEmail,
} from "./support/storefront"

test("a declined card keeps the customer on the checkout with the cart intact", async ({
  page,
}) => {
  const email = uniqueEmail("declined")
  const country = await resolveCountry(page)

  await addAProductToCart(page, country)
  await goToCheckoutFromCart(page, country)

  await completeGuestContactStep(page, email)
  await completeAddressStep(page, country)
  await completeDeliveryStep(page)

  await completePaymentStep(page, testCards.declined)
  await placeOrder(page)

  await expect(page.getByTestId("stripe-payment-error-message")).toContainText(
    /declined/i,
    { timeout: 90_000 }
  )
  await expect(page).not.toHaveURL(/\/confirmed/)
  await expect(page).toHaveURL(/step=review/)

  await page.goto(pathsFor(country).cart)
  await expect(page.getByTestId("cart-items")).toBeVisible()
  await expect(page.getByTestId("product-row")).toHaveCount(1)
  await expect(page.getByTestId("checkout-button")).toBeVisible()
})
