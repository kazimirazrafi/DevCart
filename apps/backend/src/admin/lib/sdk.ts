import Medusa from "@medusajs/js-sdk"

/* Same origin as the dashboard (/app), and session auth as the dashboard
 * uses it. */
export const sdk = new Medusa({
  baseUrl: "/",
  debug: false,
  auth: {
    type: "session",
  },
})
