import {
  authenticate,
  configureStoreSearch,
  defineMiddlewares,
  validateAndTransformBody,
} from "@medusajs/framework/http"

import { AdminModerateReviewSchema } from "./admin/reviews/validators"
import { ensureEmailVerified } from "./middlewares/ensure-email-verified"
import { callerKey, rateLimit } from "./middlewares/rate-limit"
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
 * Coarse per-caller flood limits for the routes a stranger can hit without a
 * cart or an account. They are not a per-account lockout — a slow guess against
 * one address is a different control this project does not have — and they are
 * deliberately generous, because a shop, an office or a phone network can put
 * many people behind one address. What they stop is a script: a list of
 * addresses to mail, an account factory, a review or newsletter flood.
 *
 * The counters live in Redis when `REDIS_URL` is set (see lib/rate-limit.ts),
 * so the limit is shared by every instance rather than multiplied by them.
 */
const FIVE_MINUTES = 5 * 60 * 1000
const TEN_MINUTES = 10 * 60 * 1000
const AN_HOUR = 60 * 60 * 1000

/*
 * Writing a review is the one store route that needs to know who is asking:
 * the customer id is the review's author and the half of its "one per customer
 * per product" key. The middleware answers 401 before the handler runs, so the
 * handler can treat `auth_context.actor_id` as present.
 */
export default defineMiddlewares({
  routes: [
    /*
     * Medusa leaves this one route open so a guest can open the confirmation
     * page they were just sent to; the order id is then the only credential,
     * and an id is a URL. `ensureOrderAccess` replaces that with the order's
     * owner or a signed token, and answers everything else as not-found.
     * `allowUnauthenticated` only means the authenticate middleware does not
     * reject a guest before the check runs.
     */
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
    /*
     * A guest's order is only created once they have proved they read the
     * address it will be sent to. The check runs before the cart is completed,
     * so an unverified checkout is refused while it is still a cart and before
     * any payment is authorized. A signed-in customer is exempt (their address
     * belongs to an account), which is why the authenticate middleware lets an
     * unauthenticated request through instead of rejecting it.
     */
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
    /*
     * Authentication is Medusa's own route, not ours, so the limit is attached
     * by path. Sign-in and registration are separated because they are bought
     * and abused for different reasons: one guesses passwords, the other
     * manufactures accounts.
     */
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
    /*
     * Both reset routes: Medusa's, which mints the token, and this project's,
     * which consumes it. They share one counter, because asking twice is asking
     * twice whichever door is used.
     */
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
    /*
     * The homepage's signup form. Open to guests by design, so the only thing
     * checked here is that the body carries a usable address.
     */
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
        // After `authenticate`, so the counter is the customer's, not the
        // address a whole office shares.
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
    /*
     * A product import CSV names its tags by value, while the importer reads
     * those columns as tag ids and fails the whole file on the first one it
     * does not find. This rewrites them (creating the tags the file names)
     * before the workflow sees it; see the middleware for the whole story.
     */
    {
      method: ["POST"],
      matcher: "/admin/products/imports",
      middlewares: [resolveImportTags],
    },
    /*
     * A wishlist is always somebody's, so all three routes answer 401 before
     * the handler runs. `actor_id` is then the customer id the handler writes
     * and filters by — nothing in the body can name a different customer.
     */
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
        // A heart is a toggle and two taps can race; the limit is well above
        // any real browsing so it only catches a script.
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
      // The product index declares filterable `status` and `sales_channel_ids`,
      // so the route narrows it to published products in the key's sales
      // channels.
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
