export const getBaseURL = () => {
  // The fallback is the local development server's own origin, which is plain
  // http: canonical URLs, the sitemap and robots.txt all build on this, and a
  // fresh clone should not claim an https origin it does not serve.
  return process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
}

/**
 * Store name used in the navigation, page titles and metadata. Set
 * NEXT_PUBLIC_STORE_NAME to rename the store; the fallback keeps a fresh clone
 * branded without any configuration.
 */
export const getStoreName = () =>
  process.env.NEXT_PUBLIC_STORE_NAME || "DevCart"
