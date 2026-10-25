import { expect, test } from "@playwright/test"

import {
  TEST_PASSWORD,
  addAProductToCart,
  completeAddressStep,
  completeDeliveryStep,
  completePaymentStep,
  completeSignedInContactStep,
  expectOrderConfirmation,
  goToCheckoutFromCart,
  pathsFor,
  placeOrder,
  registerThroughStorefront,
  resolveCountry,
  uniqueEmail,
} from "./support/storefront"

test("a registered customer buys, signs out, signs back in and sees the order", async ({
  page,
}) => {
  const email = uniqueEmail("account")
  const country = await resolveCountry(page)
  const paths = pathsFor(country)

  await registerThroughStorefront(page, country, email)

  await addAProductToCart(page, country)
  await goToCheckoutFromCart(page, country)

  await completeSignedInContactStep(page, email)
  await completeAddressStep(page, country)
  await completeDeliveryStep(page)
  await completePaymentStep(page)
  await placeOrder(page)

  const orderNumber = await expectOrderConfirmation(page)

  await page.goto(paths.account)
  await page.getByTestId("logout-button").click()
  await expect(page.getByTestId("login-page")).toBeVisible({ timeout: 60_000 })

  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("password-input").fill(TEST_PASSWORD)
  await page.getByTestId("sign-in-button").click()
  await expect(page.getByTestId("logout-button")).toBeVisible({ timeout: 60_000 })

  await page.goto(paths.accountOrders)
  await expect(page.getByTestId("orders-list")).toBeVisible({ timeout: 60_000 })
  await expect(page.getByTestId("orders-list")).toContainText(orderNumber)
})
