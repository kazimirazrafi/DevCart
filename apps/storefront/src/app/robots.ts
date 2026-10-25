import { MetadataRoute } from "next"

import { absoluteUrl } from "@lib/util/seo"

/* Per-visitor pages (account, cart, checkout, order, token links) and the API
 * routes are disallowed; those pages also answer noindex in their metadata. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/*/account",
          "/*/account/",
          "/*/cart",
          "/*/checkout",
          "/*/checkout/",
          "/*/order/",
          "/*/reset-password",
          "/*/verify-account",
        ],
      },
    ],
    // No `host`: the sitemap line already names where the site lives.
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
