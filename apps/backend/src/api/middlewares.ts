import {
  authenticate,
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"

import { AdminModerateReviewSchema } from "./admin/reviews/validators"
import { ensureEmailVerified } from "./middlewares/ensure-email-verified"
import { callerKey, rateLimit } from "./middlewares/rate-limit"
import { resolveImportCategories } from "./middlewares/resolve-import-categories"
import { resolveImportTags } from "./middlewares/resolve-import-tags"
import { ensureOrderAccess } from "./middlewares/ensure-order-access"
import {
  StoreConfirmEmailCodeSchema,
  StoreRequestEmailCodeSchema,
} from "./store/email-verification/validators"
import { StoreSubscribeNewsletterSchema } from "./store/newsletter/validators"
import { StoreCreateReviewSchema } from "./store/products/[id]/reviews/validators"
import { StoreAddWishlistItemSchema } from "./store/wishlist/validators"

/*
 * Guest-reachable routes share a flood limit per caller. Generous on purpose:
 * offices and mobile networks put many people behind one address.
 */
const FIVE_MINUTES = 5 * 60 * 1000
const TEN_MINUTES = 10 * 60 * 1000
const AN_HOUR = 60 * 60 * 1000

export default defineMiddlewares({
  routes: [
    // Medusa leaves this read open for guests, so the owner or a signed token
    // is checked here instead.
    {
      method: ["GET"],
      matcher: "/store/orders/:id",
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
        ensureOrderAccess,
      ],
    },
    // Runs before the cart is completed, so an unverified guest checkout is
    // refused before any payment is authorized. Signed-in customers skip it.
    {
      method: ["POST"],
      matcher: "/store/carts/:id/complete",
      middlewares: [
        authenticate("customer", ["session", "bearer"], {
          allowUnauthenticated: true,
        }),
        ensureEmailVerified,
      ],
    },
    // Medusa's own auth routes, so the limits are attached by path.
    {
      method: ["POST"],
      matcher: "/auth/customer/emailpass",
      middlewares: [
        rateLimit({
          bucket: "auth-customer-signin",
          limit: 60,
          windowMs: FIVE_MINUTES,
          message:
            "Too many sign-in attempts from this connection just now. Wait a few minutes and try again.",
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/auth/customer/emailpass/register",
      middlewares: [
        rateLimit({
          bucket: "auth-customer-register",
          limit: 60,
          windowMs: AN_HOUR,
          message:
            "Too many accounts were created from this connection just now. Try again later.",
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/auth/user/emailpass",
      middlewares: [
        rateLimit({
          bucket: "auth-admin-signin",
          limit: 30,
          windowMs: FIVE_MINUTES,
          message:
            "Too many admin sign-in attempts from this connection just now. Wait a few minutes and try again.",
        }),
      ],
    },
    // Medusa's reset route and ours share one counter.
    {
      method: ["POST"],
      matcher: "/auth/customer/emailpass/reset-password",
      middlewares: [
        rateLimit({
          bucket: "auth-reset",
          limit: 10,
          windowMs: AN_HOUR,
          message:
            "Too many password reset requests from this connection just now. Try again in a little while.",
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/auth/reset-password",
      middlewares: [
        rateLimit({
          bucket: "auth-reset",
          limit: 10,
          windowMs: AN_HOUR,
          message:
            "Too many password reset requests from this connection just now. Try again in a little while.",
        }),
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/email-verification/request",
      middlewares: [validateAndTransformBody(StoreRequestEmailCodeSchema)],
    },
    {
      method: ["POST"],
      matcher: "/store/email-verification/confirm",
      middlewares: [validateAndTransformBody(StoreConfirmEmailCodeSchema)],
    },
    {
      method: ["POST"],
      matcher: "/store/newsletter",
      middlewares: [
        rateLimit({
          bucket: "newsletter",
          limit: 10,
          windowMs: TEN_MINUTES,
          message:
            "Too many newsletter sign-ups from this connection just now. Try again in a few minutes.",
        }),
        validateAndTransformBody(StoreSubscribeNewsletterSchema),
      ],
    },
    {
      method: ["POST"],
      matcher: "/store/products/:id/reviews",
      middlewares: [
        authenticate("customer", ["bearer", "session"]),
        // After authenticate, so the counter is the customer's, not an address.
        rateLimit({
          bucket: "review-create",
          limit: 10,
          windowMs: AN_HOUR,
          key: callerKey,
          message:
            "You have posted several reviews just now. Try again in a little while.",
        }),
        validateAndTransformBody(StoreCreateReviewSchema),
      ],
    },
    {
      method: ["POST"],
      matcher: "/admin/reviews/:id",
      middlewares: [validateAndTransformBody(AdminModerateReviewSchema)],
    },
    // Import CSVs name tags and categories; both are rewritten to ids before
    // the workflow sees the file.
    {
      method: ["POST"],
      matcher: "/admin/products/imports",
      middlewares: [
        resolveImportTags,
        // Categories second: the pass above writes the file this one reads.
        resolveImportCategories,
      ],
    },
    // Wishlist routes are always scoped to the signed-in customer.
    {
      method: ["GET"],
      matcher: "/store/wishlist",
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },
    {
      method: ["POST"],
      matcher: "/store/wishlist",
      middlewares: [
        authenticate("customer", ["bearer", "session"]),
        // A toggle, so the limit only has to catch scripts.
        rateLimit({
          bucket: "wishlist-save",
          limit: 300,
          windowMs: TEN_MINUTES,
          key: callerKey,
          message:
            "Too many wishlist changes just now. Wait a moment and try again.",
        }),
        validateAndTransformBody(StoreAddWishlistItemSchema),
      ],
    },
    {
      method: ["DELETE"],
      matcher: "/store/wishlist/:id",
      middlewares: [authenticate("customer", ["bearer", "session"])],
    },
    {
      // The product index filters on status and sales channel.
      method: ["POST"],
      matcher: "/store/search",
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
  ],
})
