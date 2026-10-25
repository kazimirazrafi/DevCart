import { expect, type Locator, type Page } from "@playwright/test"

import { verificationCodeFor } from "./database"

// Shared checkout steps. Selectors are the data-testid values the components
// already carry, and the country comes from the / redirect at runtime.
export const uniqueEmail = (prefix: string) =>
  `e2e.${prefix}.${Date.now()}.${Math.floor(Math.random() * 1_000_000)}@example.com`

export const TEST_PASSWORD = "e2e-Password-123"

// The country the storefront redirects a bare / to.
export async function resolveCountry(page: Page): Promise<string> {
  await page.goto("/")
  await page.waitForURL((url) => /^\/[a-z]{2}(\/|$)/.test(url.pathname), {
    timeout: 60_000,
  })

  const country = new URL(page.url()).pathname.split("/")[1]

  expect(country).toMatch(/^[a-z]{2}$/)

  return country
}

export const pathsFor = (country: string) => ({
  home: `/${country}`,
  store: `/${country}/store`,
  cart: `/${country}/cart`,
  account: `/${country}/account`,
  accountOrders: `/${country}/account/orders`,
  checkout: `/${country}/checkout`,
})

// Products come from the listing rather than a hard-coded handle, so an
// out-of-stock item does not fail the flow. The first five are tried.
export async function addAProductToCart(page: Page, country: string) {
  const store = pathsFor(country).store

  await page.goto(store)

  const cards = page.locator('[data-testid="products-list"] a[href*="/products/"]')
  await expect(cards.first()).toBeVisible({ timeout: 60_000 })

  const attempts = Math.min(await cards.count(), 5)

  for (let index = 0; index < attempts; index += 1) {
    await page.goto(store)
    await page
      .locator('[data-testid="products-list"] a[href*="/products/"]')
      .nth(index)
      .click()
    await page.waitForURL(/\/products\/[^/]+(\?.*)?$/)

    await selectOptionsUntilBuyable(page)

    const addButton = page.getByTestId("add-product-button")

    if (await addButton.isEnabled()) {
      // The add is a server action and a click before hydration does nothing, so
      // click until the header count moves.
      const counter = page.getByTestId("nav-cart-count").first()
      let counted = false

      for (let attempt = 0; attempt < 3 && !counted; attempt += 1) {
        await addButton.click({ timeout: 15_000 }).catch(() => {})

        counted = await expect
          .poll(
            async () => Number((await counter.textContent().catch(() => "0")) ?? 0),
            { timeout: 8_000 }
          )
          .toBeGreaterThan(0)
          .then(() => true)
          .catch(() => false)
      }

      await waitForCartLine(page, pathsFor(country).cart)
      return
    }
  }

  throw new Error(
    "None of the first five products on the listing could be added to the cart."
  )
}

// Picks the first option combination that makes the buy box live.
async function selectOptionsUntilBuyable(page: Page) {
  const addButton = page.getByTestId("add-product-button")

  if (await addButton.isEnabled()) {
    return
  }

  const groups = page.getByTestId("product-options")

  for (let group = 0; group < (await groups.count()); group += 1) {
    const options = groups.nth(group).getByTestId("option-button")

    for (let option = 0; option < (await options.count()); option += 1) {
      await options.nth(option).click()

      if (await addButton.isEnabled()) {
        return
      }
    }
  }
}

// The cart cookie is written by the server action, so the cart page is polled.
async function waitForCartLine(page: Page, cartPath: string, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    await page.goto(cartPath)

    if (await page.getByTestId("cart-items").count()) {
      return
    }

    await page.waitForTimeout(1_000)
  }

  throw new Error("The product was never added to the cart.")
}

export async function goToCheckoutFromCart(page: Page, country: string) {
  await page.goto(pathsFor(country).cart)
  await expect(page.getByTestId("cart-items")).toBeVisible({ timeout: 30_000 })
  await page.getByTestId("checkout-button").click()
  await page.waitForURL(/\/checkout/)
}

// Guest contact step: the address, the mailed code, then the confirm.
export async function completeGuestContactStep(
  page: Page,
  email: string
): Promise<void> {
  await expect(page.getByTestId("contact-email-input")).toBeVisible()
  await page.getByTestId("contact-email-input").fill(email)
  await page.getByTestId("submit-contact-button").click()

  await expect(page.getByTestId("verify-email")).toBeVisible({ timeout: 30_000 })

  const code = await verificationCodeFor(email)

  await page.getByTestId("verification-code-input").fill(code)
  await page.getByTestId("verify-email-button").click()
  await expect(page).toHaveURL(/step=address/, { timeout: 60_000 })
}

// A signed-in cart may already carry the email, so both shapes are handled:
// an open contact form and a collapsed summary.
export async function completeSignedInContactStep(page: Page, email: string) {
  const openForm = page.getByTestId("contact-signed-in")
  const summary = page.getByTestId("contact-summary")

  await expect(openForm.or(summary).first()).toBeVisible({ timeout: 60_000 })

  if (await openForm.count()) {
    await page.getByTestId("submit-contact-button").click()
  }

  await expect(page).toHaveURL(/step=address/, { timeout: 60_000 })
  await expect(page.getByTestId("contact-summary")).toContainText(email)
}

export async function completeAddressStep(page: Page, country: string) {
  await page.getByTestId("shipping-first-name-input").fill("Ada")
  await page.getByTestId("shipping-last-name-input").fill("Lovelace")
  await page.getByTestId("shipping-address-input").fill("12 Test Street")
  await page.getByTestId("shipping-postal-code-input").fill("2100")
  await page.getByTestId("shipping-city-input").fill("Copenhagen")
  await page.getByTestId("shipping-country-select").selectOption(country)
  await page.getByTestId("submit-address-button").click()
  await expect(page).toHaveURL(/step=delivery/, { timeout: 60_000 })
}

export async function completeDeliveryStep(page: Page) {
  await page.getByTestId("delivery-option-radio").first().click()

  const submit = page.getByTestId("submit-delivery-option-button")
  await expect(submit).toBeEnabled({ timeout: 30_000 })
  await submit.click()
  await expect(page).toHaveURL(/step=payment/, { timeout: 60_000 })
}

// The card form lives in a Stripe iframe, so the frame is found by looking for
// the first one that actually holds a text box.
async function stripeCardInputs(page: Page): Promise<Locator> {
  const deadline = Date.now() + 60_000
  let cardTabClicked = false

  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      if (!frame.url().includes("js.stripe.com")) {
        continue
      }

      // Accounts with several methods render a Card tab first; single-method
      // accounts have none, so a missing tab is not an error.
      if (!cardTabClicked) {
        const cardTab = frame.getByRole("button", { name: /^card$/i })

        if (await cardTab.count()) {
          await cardTab.first().click().catch(() => {})
          cardTabClicked = true
          await page.waitForTimeout(500)
          continue
        }
      }

      const inputs = frame.getByRole("textbox")
      const visible = await inputs
        .first()
        .isVisible()
        .catch(() => false)

      if (visible) {
        return inputs
      }
    }

    await page.waitForTimeout(250)
  }

  throw new Error("Stripe's card form did not appear on the payment step.")
}

export const testCards = {
  success: "4242424242424242",
  declined: "4000000000000002",
} as const

// Fills the card fields through Stripe's frame and stops on the review step.
export async function completePaymentStep(
  page: Page,
  cardNumber: string = testCards.success
) {
  const fields = await stripeCardInputs(page)

  // Name the fields by position: the same frame also holds Stripe Link's email
  // and phone, so "the fourth text box" is not a postal code.
  await fields.nth(0).waitFor({ timeout: 60_000 })
  await fields.nth(0).fill(cardNumber)
  await fields.nth(1).fill("12/34")
  await fields.nth(2).fill("123")

  const submit = page.getByTestId("submit-payment-button")
  await expect(submit).toBeEnabled({ timeout: 60_000 })
  await submit.click()
  await expect(page).toHaveURL(/step=review/, { timeout: 60_000 })
}

export async function placeOrder(page: Page) {
  await expect(page.getByTestId("submit-order-button")).toBeEnabled()
  await page.getByTestId("submit-order-button").click()
}

export async function expectOrderConfirmation(page: Page): Promise<string> {
  await page.waitForURL(/\/order\/[^/]+\/confirmed/, { timeout: 120_000 })

  const orderNumber = page.getByTestId("order-number")
  await expect(orderNumber).toBeVisible({ timeout: 30_000 })

  const value = await orderNumber.getAttribute("data-value")

  expect(value, "the confirmation page reports the order's display id").toBeTruthy()

  return value as string
}

export async function registerThroughStorefront(
  page: Page,
  country: string,
  email: string,
  password: string = TEST_PASSWORD
) {
  await page.goto(pathsFor(country).account)
  await page.getByTestId("register-button").click()
  await expect(page.getByTestId("register-page")).toBeVisible()

  await page.getByTestId("first-name-input").fill("Ada")
  await page.getByTestId("last-name-input").fill("Lovelace")
  await page.getByTestId("email-input").fill(email)
  await page.getByTestId("password-input").fill(password)
  await page.getByTestId("create-account-button").click()

  // Wait for the log-out control: the account layout also wraps the forms, so
  // it would pass while the form is still on screen.
  await expect(page.getByTestId("logout-button")).toBeVisible({
    timeout: 60_000,
  })
}
