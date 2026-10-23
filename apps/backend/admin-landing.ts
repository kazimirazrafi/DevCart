
/**
 * Opens the admin on the store dashboard instead of the Orders page.
 *
 * Medusa's dashboard hardcodes its own home route: `/app` renders a component
 * whose only job is `navigate("/orders")`, and a custom admin route cannot
 * claim that path — a route whose path is empty is dropped before it reaches
 * the router. The landing is therefore decided outside the React app, at the
 * one place the admin own code does not control: the HTML the SPA boots from.
 *
 * The script does exactly three things:
 *
 * 1. A page load of the admin root is replaced with the dashboard's address, so
 *    a bookmark, a typed URL or a refresh lands on the dashboard.
 * 2. Signing in navigates the SPA to the root without a page load; a navigation
 *    whose target is the admin root is turned into the same replacement. The
 *    built-in redirect to Orders never runs because the page is leaving.
 * 3. A sign-in that starts from a directly opened login page has no return
 *    address to honour, so the dashboard sends it to Orders by name. That
 *    single navigation — the one that *leaves* the login page for Orders — is
 *    turned into the dashboard too; every other Orders navigation, the
 *    sidebar's included, is left alone.
 *
 * Paths other than those are untouched, so every other admin page — Orders
 * included — behaves normally. If Medusa ever makes the home route
 * configurable, this file and its two lines in medusa-config.ts are what to
 * delete.
 */
/**
 * The shape Vite needs from the one plugin below, spelled out rather than
 * imported: the admin bundler merges this into its own config, and a type-only
 * import of an ESM package from this CommonJS config file is not allowed.
 */
type AdminHtmlPlugin = {
  name: string
  transformIndexHtml: {
    order: "pre"
    handler: () => {
      tag: "script"
      injectTo: "head-prepend"
      children: string
    }[]
  }
}

export const adminLandingPlugin = (
  base: string | undefined = "/app"
): AdminHtmlPlugin => ({
  name: "dtc-admin-landing",
  transformIndexHtml: {
    order: "pre",
    handler: () => [
      {
        tag: "script",
        injectTo: "head-prepend",
        children: landingScript(base),
      },
    ],
  },
})

const landingScript = (base: string) => {
  const root = base.replace(/\/+$/, "") || "/"
  const dashboard = `${root}/dashboard`
  const orders = `${root}/orders`
  const login = `${root}/login`

  return `
(function () {
  var ROOT = ${JSON.stringify(root)}
  var DASHBOARD = ${JSON.stringify(dashboard)}
  var ORDERS = ${JSON.stringify(orders)}
  var LOGIN = ${JSON.stringify(login)}
  var isRoot = function (path) {
    return path === ROOT || path === ROOT + "/"
  }
  var isLogin = function (path) {
    return path === LOGIN || path === LOGIN + "/"
  }

  if (isRoot(window.location.pathname)) {
    window.location.replace(DASHBOARD)
    return
  }

  var wrap = function (name) {
    var original = window.history[name]
    window.history[name] = function (state, title, url) {
      if (url != null) {
        var next = new URL(String(url), window.location.href)
        var leavingLogin = isLogin(window.location.pathname)

        if (isRoot(next.pathname) || (leavingLogin && next.pathname === ORDERS)) {
          window.location.replace(DASHBOARD)
          return
        }
      }
      return original.apply(this, arguments)
    }
  }

  wrap("pushState")
  wrap("replaceState")
})()
`.trim()
}
