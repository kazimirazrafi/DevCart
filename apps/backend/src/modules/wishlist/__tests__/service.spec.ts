import { moduleIntegrationTestRunner } from "@medusajs/test-utils"

import { WISHLIST_MODULE } from ".."
import { WishlistItem } from "../models/wishlist-item"
import WishlistModuleService from "../service"

jest.setTimeout(60 * 1000)

moduleIntegrationTestRunner<WishlistModuleService>({
  moduleName: WISHLIST_MODULE,
  moduleModels: [WishlistItem],
  resolve: "./src/modules/wishlist",
  testSuite: ({ service }) => {
    describe("Wishlist module service", () => {
      it("saves a product for a customer", async () => {
        const item = await service.createWishlistItems({
          customer_id: "cus_1",
          product_id: "prod_1",
        })

        expect(typeof item.id).toBe("string")
        expect(item.id.length).toBeGreaterThan(0)
        expect(item.customer_id).toBe("cus_1")
        expect(item.product_id).toBe("prod_1")
        expect(item.variant_id).toBeNull()
        expect(item.created_at).toBeTruthy()
      })

      it("keeps the variant that was saved with the product", async () => {
        const item = await service.createWishlistItems({
          customer_id: "cus_2",
          product_id: "prod_2",
          variant_id: "variant_2",
        })

        const stored = await service.retrieveWishlistItem(item.id)

        expect(stored.variant_id).toBe("variant_2")
      })

      it("lists only the customer's own saves", async () => {
        await service.createWishlistItems([
          { customer_id: "cus_a", product_id: "prod_a" },
          { customer_id: "cus_a", product_id: "prod_b" },
          { customer_id: "cus_b", product_id: "prod_a" },
        ])

        const mine = await service.listWishlistItems({ customer_id: "cus_a" })

        expect(mine).toHaveLength(2)
        expect(mine.map((item) => item.product_id).sort()).toEqual([
          "prod_a",
          "prod_b",
        ])
      })

      it("refuses a second save of the same product by the same customer", async () => {
        await service.createWishlistItems({
          customer_id: "cus_c",
          product_id: "prod_c",
        })

        await expect(
          service.createWishlistItems({
            customer_id: "cus_c",
            product_id: "prod_c",
          })
        ).rejects.toThrow()
      })

      it("lets two customers save the same product", async () => {
        await service.createWishlistItems([
          { customer_id: "cus_d", product_id: "prod_d" },
          { customer_id: "cus_e", product_id: "prod_d" },
        ])

        const [, count] = await service.listAndCountWishlistItems({
          product_id: "prod_d",
        })

        expect(count).toBe(2)
      })

      it("updates the variant on a save", async () => {
        const item = await service.createWishlistItems({
          customer_id: "cus_f",
          product_id: "prod_f",
        })

        const updated = await service.updateWishlistItems({
          id: item.id,
          variant_id: "variant_f",
        })

        expect(updated.variant_id).toBe("variant_f")
      })

      it("deletes a save", async () => {
        const item = await service.createWishlistItems({
          customer_id: "cus_g",
          product_id: "prod_g",
        })

        await service.deleteWishlistItems([item.id])

        await expect(service.retrieveWishlistItem(item.id)).rejects.toThrow()

        const remaining = await service.listWishlistItems({
          customer_id: "cus_g",
        })

        expect(remaining).toHaveLength(0)
      })
    })
  },
})
