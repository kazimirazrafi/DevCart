import { MetadataRoute } from "next"

import { absoluteUrl } from "@lib/util/seo"

/*
 * Everything a customer can browse is fair game. The disallowed paths are the
 * ones that only make sense for one visitor — their account, cart, checkout,
 * order and the token-carrying pages — and the storefront's own API routes.
 * Each of those pages also answers `noindex` in its metadata, so a crawler that
 * arrives from a link rather than the sitemap still leaves it alone.
 */
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
    // No `host`: it is a Yandex-era directive that wants a bare hostname and
    // the sitemap line already tells every crawler where the site lives.
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
