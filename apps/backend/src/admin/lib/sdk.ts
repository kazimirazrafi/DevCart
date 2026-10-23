import Medusa from "@medusajs/js-sdk"

/**
 * The admin's own client for the project's API routes.
 *
 * `baseUrl: "/"` because the dashboard is served by this backend itself (`/app`),
 * so the API is on the same origin — an absolute backend URL would only add a
 * cross-origin hop. `auth.type: "session"` is how the dashboard signs in.
 */
export const sdk = new Medusa({
  baseUrl: "/",
  debug: false,
  auth: {
    type: "session",
  },
})
