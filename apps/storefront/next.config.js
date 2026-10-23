const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

const BACKEND_URL = (
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
).replace(/\/+$/, "")

const isDevelopment = process.env.NODE_ENV !== "production"

/**
 * The fetch directives are still a proposal, so they ship as
 * `Content-Security-Policy-Report-Only`: the browser logs what it would block
 * without blocking it. Enforcing them today would take the card form down —
 * Stripe mounts frames and connects to its own API — and Next's own bootstrap
 * is an inline script, which no policy without a nonce can allow and still
 * mean anything. A nonce is the fix for the second half, and it costs static
 * rendering, so it is deliberately a separate decision.
 *
 * Everything a correct policy would need is assembled here from the same env
 * the app reads, so turning enforcement on is a header rename once a sweep
 * across the shop (including checkout) reports no violations.
 */
const contentSecurityPolicy = () => {
  const sources = [
    "default-src 'self'",
    // `unsafe-inline` is Next's bootstrap and the theme script; `unsafe-eval`
    // is the dev overlay's own debugging, never the production build.
    `script-src 'self' 'unsafe-inline' https://js.stripe.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
    // Tailwind ships as a stylesheet, but React and Headless UI set style
    // attributes, which a policy without this would block.
    "style-src 'self' 'unsafe-inline'",
    // Optimised images are same-origin (`/_next/image`); the rest are the
    // upload bucket and the demo catalogue, which an unoptimised reference or
    // an admin's own host would need.
    `img-src 'self' data: blob: ${BACKEND_URL} https://cdn.dummyjson.com https://*.s3.amazonaws.com${S3_HOSTNAME ? ` https://${S3_HOSTNAME}` : ""}`,
    "font-src 'self' data:",
    `connect-src 'self' ${BACKEND_URL} https://api.stripe.com${isDevelopment ? ` ws://localhost:8000` : ""}`,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
  ]

  return sources.join("; ")
}

/**
 * The directives below cannot break a page that renders today: none of them
 * governs a resource the shop fetches. They are enforced so the half of a CSP
 * that costs nothing is already on, and the fetch half is reported beside them.
 */
const enforcedSecurityPolicy = [
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "form-action 'self'",
].join("; ")

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        /*
         * Defence in depth for every response: no MIME sniffing, no framing by
         * another origin, no camera or microphone, HTTPS only once DNS is on
         * it, and the half of a CSP that governs nothing a page fetches.
         *
         * Referrer-Policy is deliberately not set here: `/order/*` sends its
         * own `no-referrer` further down, and two matching rules would put two
         * values on the response. Everywhere else keeps the browser's default
         * (`strict-origin-when-cross-origin`), which already sends a bare
         * origin to other sites.
         */
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "Content-Security-Policy", value: enforcedSecurityPolicy },
          {
            key: "Content-Security-Policy-Report-Only",
            value: contentSecurityPolicy(),
          },
        ],
      },
      {
        /*
         * Order pages carry an access token in the query string (the guest's
         * proof that they may read the order). A referrer would hand that
         * token to whatever page the visitor opens next, so these routes send
         * none at all, and images or other subresources on them send none
         * either. The rest of the site keeps Next's default.
         */
        source: "/:countryCode/order/:path*",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    /*
     * The optimiser is on: the catalogue's photography is uploaded at full
     * resolution (some of the demo PNGs are ~950 kB), and a listing of twelve
     * plates was 3.1 MB of images before this. With it enabled, `next start`
     * fetches each original once, resizes it to the width the layout asks for
     * (`sizes` on every plate) and serves AVIF or WebP. It also gives the
     * product page's main image a real `srcset` and `fetchpriority="high"`, so
     * the largest paint is fetched once at the right size instead of last.
     *
     * The trade is that the optimiser fetches the original itself: a deploy
     * must be able to reach the image host, and a host that is not listed here
     * is refused (the plate falls back to "No image"). Add a host here when a
     * shop uploads its own photography elsewhere. `unoptimized: true` used to
     * stand in for this, and it is why nothing was being resized at all.
     */
    formats: ["image/avif", "image/webp"],
    // 31 days: an upload is immutable in this catalogue, and the filenames are
    // content-addressed by the optimiser's own cache key.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      // The open demo catalogue the seeded wardrobe lines photograph.
      {
        protocol: "https",
        hostname: "cdn.dummyjson.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
