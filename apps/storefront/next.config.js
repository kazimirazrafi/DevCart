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
 * Fetch directives ship report-only: enforcing them today would break the Stripe
 * card form, and Next's inline bootstrap needs a nonce. Flip the header once a
 * sweep of the shop reports no violations.
 */
const contentSecurityPolicy = () => {
  const sources = [
    "default-src 'self'",
    // unsafe-inline is Next's bootstrap and the theme script; eval only in dev.
    `script-src 'self' 'unsafe-inline' https://js.stripe.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
    // React and Headless UI set style attributes.
    "style-src 'self' 'unsafe-inline'",
    // Same-origin for /_next/image, plus the upload bucket and demo catalogue.
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

/** The directives that govern no fetched resource, so they are enforced. */
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
        // Referrer-Policy is not set here: the /order rule below sets its own, and
        // two matching rules would put two values on the response.
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
        // Order pages carry an access token in the query string, so no referrer
        // may leak it to whatever the visitor opens next.
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
     * The optimiser resizes uploads on first request and serves AVIF/WebP. It
     * fetches the original itself, so every image host must be listed below or
     * the plate falls back to "No image".
     */
    formats: ["image/avif", "image/webp"],
    // 31 days: uploads are immutable and the optimiser's cache key is content-addressed.
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
