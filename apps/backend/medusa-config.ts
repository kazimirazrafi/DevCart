import {
  ContainerRegistrationKeys,
  defineConfig,
  loadEnv,
  Modules,
} from "@medusajs/framework/utils"

import { adminBrandingPlugin } from "./admin-branding"
import { adminLandingPlugin } from "./admin-landing"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

/*
 * S3 when the bucket is fully configured, local disk otherwise. The provider
 * throws on a missing option, so a half-configured bucket must fall back rather
 * than stop the backend from booting. S3_FILE_URL is the public read base for
 * hosts whose endpoint is not public (R2, Spaces).
 */
const s3Endpoint = process.env.S3_URL?.replace(/\/+$/, "")
const s3Region = process.env.S3_REGION || "auto"
const s3FileUrl =
  process.env.S3_FILE_URL?.replace(/\/+$/, "") ||
  (s3Endpoint
    ? `${s3Endpoint}/${process.env.S3_BUCKET}`
    : `https://${process.env.S3_BUCKET}.s3.${s3Region}.amazonaws.com`)

const fileStorageProviders =
  process.env.S3_BUCKET &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY
    ? [
        {
          resolve: "@medusajs/medusa/file-s3",
          id: "s3",
          options: {
            file_url: s3FileUrl,
            bucket: process.env.S3_BUCKET,
            access_key_id: process.env.S3_ACCESS_KEY_ID,
            secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
            region: s3Region,
            // Empty for AWS; R2, MinIO and Spaces need one.
            endpoint: s3Endpoint || undefined,
            prefix: process.env.S3_PREFIX || undefined,
            // R2, B2 and Object-Ownership buckets reject ACL headers.
            acl: process.env.S3_ACL === "false" ? false : undefined,
          },
        },
      ]
    : [
        {
          resolve: "@medusajs/medusa/file-local",
          id: "local",
          options: {
            backend_url: `${process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"}/static`,
          },
        },
      ]

/*
 * Stripe only loads with a key: a missing one throws at startup. Its provider
 * id is pp_stripe_stripe, which the seed puts on the region.
 */
const stripeProvider = process.env.STRIPE_API_KEY
  ? [
      {
        resolve: "@medusajs/medusa/payment-stripe",
        id: "stripe",
        options: {
          apiKey: process.env.STRIPE_API_KEY,
          // Medusa serves the webhook at /hooks/payment/stripe_stripe.
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          // Capture at checkout instead of only authorizing the card.
          capture: true,
        },
      },
    ]
  : []

/*
 * Resend once its key and sender are set, the local provider otherwise. Two
 * providers on one channel is a startup error, so this is one or the other.
 */
const emailNotificationProviders =
  process.env.RESEND_API_KEY && process.env.RESEND_FROM
    ? [
        {
          resolve: "./src/modules/notification-resend",
          id: "resend",
          options: {
            apiKey: process.env.RESEND_API_KEY,
            from: process.env.RESEND_FROM,
            channels: ["email"],
            // Left empty in normal use; a stub can stand in for Resend.
            baseUrl: process.env.RESEND_BASE_URL || undefined,
            storeName: process.env.STORE_NAME || undefined,
          },
        },
      ]
    : [
        {
          resolve: "@medusajs/medusa/notification-local",
          id: "local",
          options: { channels: ["email"] },
        },
      ]

/*
 * Naming providers replaces the module's defaults, so the feed channel must be
 * listed too; without it export and import notifications go nowhere.
 */
const notificationProviders = [
  ...emailNotificationProviders,
  {
    resolve: "@medusajs/medusa/notification-local",
    id: "feed",
    options: { channels: ["feed"] },
  },
]

/*
 * Import and export run steps in the background, which the in-memory engine
 * cannot do. Without REDIS_URL the in-memory engine is used and those two
 * features stop working; everything else still boots.
 */
const workflowEngine = process.env.REDIS_URL
  ? [
      {
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: {
          redis: { redisUrl: process.env.REDIS_URL },
        },
      },
    ]
  : []

/*
 * Google needs all three values; the provider throws without them. Listing
 * providers replaces the auth defaults, so emailpass is named back as well or
 * every password login stops working.
 */
const authModule = process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
  ? [
      {
        resolve: "@medusajs/medusa/auth",
        dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/auth-emailpass",
              id: "emailpass",
            },
            {
              resolve: "@medusajs/medusa/auth-google",
              id: "google",
              options: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackUrl: process.env.GOOGLE_CALLBACK_URL,
              },
            },
          ],
        },
      },
    ]
  : []

module.exports = defineConfig({
  /* The two admin HTML plugins; both are described in their own files. */
  admin: {
    vite: (config) => ({
      plugins: [adminLandingPlugin(config.base), adminBrandingPlugin()],
    }),
  },
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    },
  },
  modules: [
    ...authModule,
    {
      resolve: "./src/modules/review",
    },
    {
      resolve: "./src/modules/wishlist",
    },
    {
      resolve: "./src/modules/email-verification",
    },
    {
      resolve: "./src/modules/stock-alert",
    },
    {
      resolve: "./src/modules/newsletter",
    },
    ...workflowEngine,
    /* Import, export and admin media uploads need the file module. */
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: fileStorageProviders,
      },
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: stripeProvider,
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: notificationProviders,
      },
    },
  ],
})
