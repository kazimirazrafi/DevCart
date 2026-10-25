/**
 * Copies `static/` into the build output.
 *
 * `medusa build` compiles `src/` into `.medusa/server/` but leaves `static/`
 * behind, while `medusa start` serves `/static` from the directory it runs in.
 * In production the start command runs from `.medusa/server`, so without this
 * copy `GET /static/product-import-template.csv` is a 404 and the admin's
 * "Download sample file" link has nothing to download.
 *
 * Runs as part of `pnpm run build`.
 */
import { cpSync, existsSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..")
const source = join(appRoot, "static")
const target = join(appRoot, ".medusa", "server", "static")

if (!existsSync(source)) {
  console.warn("[copy-static] no static/ directory; nothing to copy")
  process.exit(0)
}

cpSync(source, target, { recursive: true })
console.log(`[copy-static] copied static/ to ${target}`)
