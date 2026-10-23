import {
  ContainerRegistrationKeys,
  defineConfig,
  loadEnv,
  Modules,
} from "@medusajs/framework/utils"

import { adminLandingPlugin } from "./admin-landing"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

/*
 * Stripe is registered only when there is a key to register it with: the
 * provider refuses to load with a missing `apiKey` ("Required option `apiKey`
 * is missing in Stripe plugin"), and that failure takes the whole backend down
 * at startup rather than disabling one payment option. So a checkout without a
 * key keeps the manual provider instead of not booting at all.
 *
 * The provider's identifier becomes `pp_stripe_stripe` (the `pp_<identifier>_<id>`
 * shape), which is the id the seed adds to the region and the storefront maps to
 * a title in `lib/constants.tsx`.
 */
const stripeProvider = process.env.STRIPE_API_KEY
  ? [
      {
        resolve: "@medusajs/medusa/payment-stripe",
        id: "stripe",
        options: {
          apiKey: process.env.STRIPE_API_KEY,
          // Medusa serves the endpoint itself at /hooks/payment/stripe_stripe;
          // without the secret every delivery fails verification and no
          // Stripe-driven order or payment update happens (see docs/SETUP.md).
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
          // The provider defaults to manual capture, which only authorizes the
          // card: the customer's money is held, not taken, and their receipt
          // can say no more than "authorised". This store takes payment at the
          // checkout, so the intent is created with automatic capture and a
          // successful order is paid for. Cancellations are refunded from the
          // admin (a captured payment has to be refunded, not voided).
          capture: true,
        },
      },
    ]
  : []

/*
 * Email (E1-E3). The notification module has no provider unless one is named,
 * so this picks exactly one for the `email` channel: Resend once both its key
 * and a verified sender are configured, and Medusa's local provider otherwise.
 * The local provider stores the notification and logs it, which keeps a fresh
 * clone and CI working (and keeps this project's dev runs off a real inbox)
 * while the order and reset flows themselves still run end to end.
 *
 * Two providers on one channel is a startup error in the notification module,
 * which is why this is a choice rather than a list: the fallback is replaced,
 * not joined, when Resend is set up.
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
            // Left empty in normal use; a local stub can stand in for Resend
            // when the email paths are tested without sending anything.
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
 * The admin's own notifications (product export finished/failed, import
 * summaries, the bell in the dashboard) travel on the `feed` channel. Listing
 * `providers` replaces the notification module's defaults, so the feed provider
 * has to be named explicitly next to whichever email provider is in use —
 * without it those notifications have no destination and the workflows that
 * send them fail, which is what made Export and Import appear broken. The local
 * provider only stores the notification (the dashboard reads it back); nothing
 * is delivered.
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
 * Product import/export are background workflows: the export runs
 * `backgroundExecution: true` and the import waits for confirmation. The
 * in-memory workflow engine cannot run a step in the background, so both left
 * the workflow stuck and the admin waiting for a notification that never came.
 * The Redis engine runs those steps on a queue; Redis is already part of the
 * project's local infrastructure (docker-compose.yml) and of the production
 * deployment.
 *
 * `REDIS_URL` is optional — without it the in-memory engine is used and those
 * two admin features are the price, which keeps a bare checkout and the test
 * suites (no Redis there) booting.
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
 * Google sign-in (A1) is registered only when all three of its options are set.
 * The provider validates them itself and refuses to load without one ("Google
 * clientId is required"), and a provider that throws takes the whole backend
 * down at startup rather than one sign-in button — the same reason Stripe is
 * registered this way above. Without the variables the storefront's sign-in
 * form still works: it is the password path that is the baseline.
 *
 * Listing `providers` at all replaces the Auth Module's defaults, so
 * `auth-emailpass` is named back in the same array. Dropping it would take every
 * password login — customers' and admin users' — with it.
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
                // The storefront page Google sends the customer back to. It is
                // also the redirect URI the OAuth client has to allow-list.
                callbackUrl: process.env.GOOGLE_CALLBACK_URL,
              },
            },
          ],
        },
      },
    ]
  : []

module.exports = defineConfig({
  /*
   * The admin opens on the custom Dashboard page rather than Medusa's built-in
   * home, which sends every visit to Orders. See `admin-landing.ts` for why the
   * landing has to be decided in the admin's HTML.
   */
  admin: {
    vite: (config) => ({
      plugins: [adminLandingPlugin(config.base)],
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
    /*
     * Product reviews (§5.5 Option A). A local module, so it needs no options;
     * it is listed here because `medusa db:generate review` and the runtime both
     * find modules through this array.
     */
    {
      resolve: "./src/modules/review",
    },
    /*
     * Wishlist (§5.5 Option B). Same shape as the review module: local, no
     * options, listed so `medusa db:generate wishlist` and the runtime can find
     * it.
     */
    {
      resolve: "./src/modules/wishlist",
    },
    /*
     * Guest email verification. Holds one row per address being proved: the
     * HMAC of the live code, its expiry, the failed attempts and the send
     * limits. The cart's completion reads the token a confirmation returns, so
     * an unverified guest checkout cannot become an order.
     */
    {
      resolve: "./src/modules/email-verification",
    },
    /*
     * Low-stock alerts (§5.5 Option C). Holds one row per inventory level: when
     * it was last reported low, which is what keeps the hourly job from mailing
     * the same shortage every hour.
     */
    {
      resolve: "./src/modules/stock-alert",
    },
    /*
     * The homepage's mailing list. Local, no options, one table of addresses;
     * listed here so `medusa db:generate newsletter` and the runtime find it.
     */
    {
      resolve: "./src/modules/newsletter",
    },
    ...workflowEngine,
    /*
     * Local file storage. Product export streams a CSV through the file module
     * and product import reads an uploaded one, so without this module both
     * routes fail; the local provider writes to `apps/backend/static` and
     * serves the download from the backend's `/static` path. The module also
     * backs admin media uploads. `MEDUSA_BACKEND_URL` is the public origin the
     * download links are built from, so it has to be the URL a browser can
     * reach, not `localhost` in production.
     */
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              backend_url: `${process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000"}/static`,
            },
          },
        ],
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
