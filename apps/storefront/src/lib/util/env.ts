export const getBaseURL = () => {
  // Local development origin; canonical URLs, the sitemap and robots.txt use it.
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
}

/** Store name for the navigation, page titles and metadata. */
export const getStoreName = () =>
  process.env.NEXT_PUBLIC_STORE_NAME || "DevCart"
