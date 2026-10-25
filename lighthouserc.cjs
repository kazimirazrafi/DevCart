/*
 * Performance budgets, measured on a production storefront build with Lighthouse
 * 12's mobile preset. The floors sit below the recorded medians so a busy machine
 * does not fail on noise, while a real regression still does.
 *
 *   LHCI_COUNTRY=bd LHCI_PRODUCT_HANDLE=black-aluminium-cup pnpm run lighthouse
 *
 * Both servers must already be running; CI starts them in lighthouse.yml.
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
      // The nightly job takes the median of three runs; one is enough locally.
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
        // Layout shift is deterministic: it is either there or not.
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.02 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
}
