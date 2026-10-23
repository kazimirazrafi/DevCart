"use server"

import { sdk } from "@lib/config"
import { ENABLED_PAYMENT_PROVIDERS } from "@lib/constants"
import { getAuthHeaders } from "./cookies"
import { HttpTypes } from "@medusajs/types"

/*
 * Read uncached, like the cart. Which providers a region offers is set in the
 * backend (the seed adds Stripe to the region), and with a cached read the
 * storefront keeps serving the list from before that change: the checkout would
 * go on offering only the manual provider with nothing to explain why. The
 * checkout page is dynamic anyway, so the cache bought one round trip.
 *
 * The region's list is filtered against the storefront's own allowlist: this
 * store sells card and cash on delivery, so any other provider the backend
 * happens to have enabled for the region is not offered.
 */
export const listCartPaymentMethods = async (regionId: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<HttpTypes.StorePaymentProviderListResponse>(
      `/store/payment-providers`,
      {
        method: "GET",
        query: { region_id: regionId },
        headers,
        cache: "no-store",
      }
    )
    .then(({ payment_providers }) =>
      payment_providers
        .filter((provider) =>
          ENABLED_PAYMENT_PROVIDERS.includes(
            provider.id as (typeof ENABLED_PAYMENT_PROVIDERS)[number]
          )
        )
        .sort((a, b) => {
          return a.id > b.id ? 1 : -1
        })
    )
    .catch(() => {
      return null
    })
}
