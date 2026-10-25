import { expect, test } from "@playwright/test"

import { pathsFor, resolveCountry } from "./support/storefront"

test("search narrows the listing, says so when nothing matches, and clears", async ({
  page,
}) => {
  const country = await resolveCountry(page)

  await page.goto(pathsFor(country).store)

  const results = page.locator('[data-testid="products-list"] a[href*="/products/"]')
  await expect(results.first()).toBeVisible({ timeout: 60_000 })

  const query = page.getByTestId("store-search-input")
  await query.fill("powder canister")

  await expect(results.first()).toBeVisible({ timeout: 30_000 })

  await expect
    .poll(async () => results.count(), { timeout: 30_000 })
    .toBeLessThanOrEqual(3)

  const titles = await page.getByTestId("product-title").allTextContents()
  expect(titles.some((title) => /powder canister/i.test(title))).toBe(true)

  // The query is part of the URL, so a search can be linked to.
  await expect(page).toHaveURL(/product(%5B|\[)query(%5D|\])=powder/)

  await query.fill("qqqqqq")
  await expect(page.getByTestId("no-products")).toBeVisible({ timeout: 30_000 })

  await page.getByTestId("store-search-clear").click()
  await expect(results.first()).toBeVisible({ timeout: 30_000 })

  await results.first().click()
  await page.waitForURL(/\/products\/[^/]+(\?.*)?$/)
  await expect(page.getByTestId("add-product-button")).toBeVisible({
    timeout: 30_000,
  })
})
