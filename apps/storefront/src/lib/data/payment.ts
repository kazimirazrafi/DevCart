"use server"

import { sdk } from "@lib/config"
import { ENABLED_PAYMENT_PROVIDERS } from "@lib/constants"
import { getAuthHeaders } from "./cookies"
import { HttpTypes } from "@medusajs/types"

/*
 * Uncached, like the cart: a cached list would keep offering providers from
 * before a backend change. The region's list is filtered against the storefront's
 * allowlist, so a provider enabled in the backend is not offered automatically.
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
