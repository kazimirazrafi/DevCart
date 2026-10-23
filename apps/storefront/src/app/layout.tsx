import { getBaseURL, getStoreName } from "@lib/util/env"
import { THEME_SCRIPT } from "@lib/theme"
import { Metadata, Viewport } from "next"
import { Bricolage_Grotesque, IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google"
import "styles/globals.css"

// Display voice: headings and product titles only.
const display = Bricolage_Grotesque({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
})

// Body and UI voice: everything a person reads in running text.
const body = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  variable: "--font-body",
})

// Machine data only: SKUs, spec tables, order numbers.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
})

const STORE_DESCRIPTION =
  "Merchandise for people who build software: apparel and desk objects printed in small runs."

const SITE_URL = getBaseURL().replace(/\/+$/, "")

/*
 * Who the shop is, once per document, so a crawler can tell the brand from the
 * products it sells and attach every page to one name.
 *
 * No `SearchAction`: the listing's URL names a region, and which countries the
 * catalogue actually serves is a property of the database, not of the build
 * (that is why `sitemap.ts` resolves its region from the API). A template naming
 * the configured default would point at a 404 on a shop whose regions are
 * elsewhere, so the node exists without the sitelinks search box.
 */
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: getStoreName(),
      url: SITE_URL,
      description: STORE_DESCRIPTION,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: getStoreName(),
      inLanguage: "en",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  // Child pages set a bare title; the template appends the store name.
  title: {
    default: `${getStoreName()}: merch for people who build software`,
    template: `%s | ${getStoreName()}`,
  },
  description: STORE_DESCRIPTION,
  applicationName: getStoreName(),
  // The homepage has no title of its own, so this is the title every share of
  // the site falls back to. Pages that set their own title override it.
  openGraph: {
    type: "website",
    siteName: getStoreName(),
    locale: "en",
    description: STORE_DESCRIPTION,
    // The file-convention image in this segment is not picked up once
    // `openGraph` is declared, so it is named here. Pages with a picture of
    // their own (a product) replace it.
    images: ["/opengraph-image.jpg"],
  },
  twitter: { card: "summary_large_image", description: STORE_DESCRIPTION },
  robots: { index: true, follow: true },
}

/*
 * The browser's own chrome follows the OS, not the store's saved choice — a
 * media query cannot read localStorage — so these are the two grounds a
 * visitor can see before the page takes over.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E8E9E3" },
    { media: "(prefers-color-scheme: dark)", color: "#14151A" },
  ],
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      /*
       * The theme script below adds `dark` before React runs, so the class on
       * this element is already the visitor's choice by the time React
       * hydrates. `suppressHydrationWarning` covers that one attribute and is
       * scoped to this element; without it every visit in dark mode would log a
       * mismatch. See the comment on the script for why the mode is not known
       * at render time.
       */
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <head>
        {/*
         * Runs before the first paint. Rendering the mode on the server is not
         * possible — the preference lives in the browser's storage and the OS
         * setting is not a header — so the server always sends the light
         * document and this script repaints the class in place. A returning
         * visitor therefore never sees the wrong mode flash; a visitor with
         * JavaScript disabled keeps the light sheet, which is what the server
         * sent.
         */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          // `<` cannot appear in a store name, but escaping it keeps the
          // element unclosable from data either way.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(SITE_JSON_LD).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      {/*
       * No `<main>` here: each route group owns its own banner, content and
       * footer, and a `main` that wrapped the header and the footer told a
       * screen reader that the navigation was the page's content. The group
       * layouts render `<main id="main">` around their children, which is also
       * what the nav's skip link targets.
       */}
      <body>{props.children}</body>
    </html>
  )
}
