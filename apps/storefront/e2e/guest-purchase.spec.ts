import { expect, test } from "@playwright/test"

import {
  addAProductToCart,
  completeAddressStep,
  completeDeliveryStep,
  completeGuestContactStep,
  completePaymentStep,
  expectOrderConfirmation,
  goToCheckoutFromCart,
  placeOrder,
  resolveCountry,
  uniqueEmail,
} from "./support/storefront"

test("a guest can buy a product end to end", async ({ page }) => {
  const email = uniqueEmail("guest")
  const country = await resolveCountry(page)

  await addAProductToCart(page, country)
  await goToCheckoutFromCart(page, country)

  await completeGuestContactStep(page, email)
  await completeAddressStep(page, country)
  await completeDeliveryStep(page)

  await completePaymentStep(page)

  await expect(page.getByTestId("review-email")).toHaveText(email)
  await expect(page.getByTestId("review-address")).toContainText("12 Test Street")

  await placeOrder(page)

  const orderNumber = await expectOrderConfirmation(page)

  expect(orderNumber).not.toEqual("")
  await expect(page.getByTestId("order-complete-container")).toContainText(
    "Your order was placed successfully."
  )
  await expect(page.getByTestId("order-complete-container")).toContainText(email)
})
