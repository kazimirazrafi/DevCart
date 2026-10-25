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

/* Organization and WebSite nodes. No SearchAction: the right region is a
 * database fact, not a build fact, so a template URL could 404. */
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

/* The browser chrome follows the OS, so both grounds are declared. */
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
      // The theme script adds `dark` before React hydrates, so this attribute is
      // the visitor's choice by then; the warning is suppressed for that only.
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <head>
        {/* Runs before the first paint: the preference is browser state, so the
            server sends the light document and this repaints the class. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script
          type="application/ld+json"
          // Escaping < keeps the element unclosable from data.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(SITE_JSON_LD).replace(/</g, "\\u003c"),
          }}
        />
      </head>
      {/* No main here: each route group renders <main id="main"> around its
          own chrome, which is what the nav's skip link targets. */}
      <body>{props.children}</body>
    </html>
  )
}
