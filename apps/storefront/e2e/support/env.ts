import { readFileSync } from "node:fs"
import { resolve } from "node:path"

// The suite runs its own servers on 3001 and 9001, so a dev pair on 8000/9000 is
// left alone. It reads the same .env files a developer already has.
export const storefrontDir = resolve(__dirname, "../..")
export const backendDir = resolve(storefrontDir, "../backend")

export const STOREFRONT_PORT = Number(process.env.E2E_STOREFRONT_PORT ?? 3001)
export const BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? 9001)
export const STOREFRONT_URL = `http://localhost:${STOREFRONT_PORT}`
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`

// The seeded region includes Denmark, so a bare / redirects here.
export const COUNTRY_CODE = "dk"

// A .env file as an object: KEY=value per line, quotes removed, comments and
// blank lines skipped. No dotenv dependency for two simple files.

export function readEnvFile(path: string): Record<string, string> {
  const contents = readFileSync(path, "utf8")
  const values: Record<string, string> = {}

  for (const line of contents.split("\n")) {
    const trimmed = line.trim()

    if (!trimmed || trimmed.startsWith("#")) {
      continue
    }

    const separator = trimmed.indexOf("=")

    if (separator === -1) {
      continue
    }

    const key = trimmed.slice(0, separator).trim()
    const raw = trimmed.slice(separator + 1).trim()
    values[key] = raw.replace(/^(['"])(.*)\1$/, "$2")
  }

  return values
}

const backendEnv = readEnvFile(resolve(backendDir, ".env"))
const storefrontEnv = readEnvFile(resolve(storefrontDir, ".env.local"))

export const publishableKey =
  process.env.E2E_PUBLISHABLE_KEY ??
  storefrontEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY ??
  backendEnv.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY

export const stripeKey = storefrontEnv.NEXT_PUBLIC_STRIPE_KEY ?? ""

// Read by the guest checkout to find the mailed code; E2E_DATABASE_URL overrides
// the backend's own setting.
export const databaseUrl =
  process.env.E2E_DATABASE_URL ?? backendEnv.DATABASE_URL ?? ""
