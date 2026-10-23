/*
 * Lighthouse CI as a regression budget, not a scoreboard.
 *
 * Every number here was taken on a production storefront build with Lighthouse
 * 12's mobile preset and its simulated throttling — the same setup the
 * performance passes in ROADMAP.md used. The floors sit below what was measured
 * so a busy CI machine cannot fail a build on noise, while a real regression
 * (a bundle that doubles, a layout that shifts, an unlabelled control) still
 * does:
 *
 *   home 91–92, listing 81–87, product 94–96, CLS 0.000–0.009, a11y/SEO 100
 *
 * The listing's floor is the accepted one: instant client-side filtering was
 * kept deliberately, and its search bundle is what keeps the default
 * simulation under 90. It is a floor now, not a target to chase.
 *
 * The performance floor is 70, not 81, because that is what the simulator
 * actually spread over on the machine these were taken on: repeated Lighthouse
 * CI runs read home 73–90, listing 72–83 and product 84–91 with no code change
 * between them, while accessibility, SEO and Best Practices stayed at 100 and
 * CLS at 0. A floor at the median would fail on a busy machine; 70 still fails
 * a build that loses a third of the score, which is what a regression looks
 * like. The category floors below are the reliable half of this gate.
 *
 *   LHCI_COUNTRY=bd LHCI_PRODUCT_HANDLE=black-aluminium-cup pnpm run lighthouse
 *
 * The servers must already be running (a production build of the storefront and
 * the backend on a seeded database). CI starts them; nightly.yml is where.
 */
const BASE = (process.env.LHCI_BASE_URL || "http://localhost:8000").replace(
  /\/+$/,
  ""
)

const COUNTRY =
  process.env.LHCI_COUNTRY || process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"

const PRODUCT_HANDLE = process.env.LHCI_PRODUCT_HANDLE

const urls = [`${BASE}/${COUNTRY}`, `${BASE}/${COUNTRY}/store`]

if (PRODUCT_HANDLE) {
  urls.push(`${BASE}/${COUNTRY}/products/${PRODUCT_HANDLE}`)
}

module.exports = {
  ci: {
    collect: {
      url: urls,
      // Three runs and the median is what Lighthouse CI reports by default.
      // A single run is enough locally; the nightly job takes the median.
      numberOfRuns: Number(process.env.LHCI_RUNS || 3),
      settings: {
        // Lighthouse launches its own Chrome; the container needs these flags.
        chromeFlags: "--headless=new --no-sandbox",
      },
    },
    assert: {
      assertions: {
        "categories:performance": ["error", { minScore: 0.7 }],
        "categories:accessibility": ["error", { minScore: 1 }],
        "categories:seo": ["error", { minScore: 1 }],
        "categories:best-practices": ["error", { minScore: 0.95 }],
        // The one metric a code change moves immediately and a machine cannot
        // make look better: a shift is either there or not.
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.02 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
}
