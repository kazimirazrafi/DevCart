import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  IFileModuleService,
  IProductModuleService,
  Logger,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  parseCsv,
  rewriteTagCells,
  stringifyCsv,
  tagValues,
} from "../../lib/csv"

type ImportBody = {
  file_key?: string
  originalname?: string
  size?: number
}

/**
 * A product import CSV names its tags with values ("makeup", "footwear"), and
 * the importer is not able to: it reads `Product Tag 1`…`Product Tag 5` as tag
 * **ids** and fails the whole import on the first product whose tag it cannot
 * find ("Tag with id makeup not found"), which surfaces in the admin as nothing
 * more than "Failed to import products from file …".
 *
 * So the file is read once, before the workflow takes it, and every tag cell is
 * replaced by the id of the tag with that value — a tag is created when the
 * store does not have it yet, because a CSV that names a tag is asking for it
 * to exist. Cells that are already ids are left alone, so an exported CSV
 * round-trips unchanged.
 *
 * Medusa has no hook between "file uploaded" and "workflow reads it", so this
 * is a middleware on the route itself: Medusa applies the route's validators
 * and `authenticate` before custom middlewares, so the body is validated and
 * the request is an admin's by the time it runs, and the route reads
 * `validatedBody` — which is what is rewritten here. Any other shape (no tag
 * columns, an unreadable file) is passed through untouched.
 */
export async function resolveImportTags(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
) {
  const body = (req.validatedBody ?? req.body) as ImportBody | undefined

  if (!body?.file_key) {
    return next()
  }

  const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  try {
    const fileModule = req.scope.resolve<IFileModuleService>(Modules.FILE)
    const contents = await fileModule.getAsBuffer(body.file_key)
    const rows = parseCsv(contents.toString("utf-8"))
    const values = tagValues(rows)

    if (!values.length) {
      return next()
    }

    const productModule =
      req.scope.resolve<IProductModuleService>(Modules.PRODUCT)
    const { ids, knownIds } = await resolveTagIds(productModule, values, logger)

    const rewritten = stringifyCsv(rewriteTagCells(rows, ids, knownIds))
    const file = await fileModule.createFiles({
      filename: body.originalname || "products.csv",
      content: rewritten,
      mimeType: "text/csv",
    })

    req.validatedBody = {
      ...body,
      file_key: file.id,
      size: Buffer.byteLength(rewritten),
    }

    logger.info(
      `Product import: ${values.length} tag value(s) in the file, ${ids.size} tag(s) known, importing ${file.id}`
    )
  } catch (error) {
    /*
     * The route's own error is the useful one — it names the column or the row
     * that broke — so a failure here must not replace it. This only says that
     * the rewrite did not happen.
     */
    logger.warn(
      `Product import: could not resolve tag values, importing the file as uploaded (${
        (error as Error)?.message ?? error
      })`
    )
  }

  return next()
}

/**
 * Every tag the store already has, plus the ones this file introduces. Listing
 * is page-wise because a shop can have more tags than one page returns, and a
 * page missed would look like new tags and fail on the unique value index.
 */
async function resolveTagIds(
  productModule: IProductModuleService,
  values: string[],
  logger: Logger
): Promise<{ ids: Map<string, string>; knownIds: Set<string> }> {
  const ids = new Map<string, string>()
  const knownIds = new Set<string>()
  const take = 200

  for (let skip = 0; ; skip += take) {
    const page = await productModule.listProductTags({}, { take, skip })

    for (const tag of page) {
      ids.set(tag.value.toLowerCase(), tag.id)
      knownIds.add(tag.id)
    }

    if (page.length < take) {
      break
    }
  }

  const missing = values.filter((value) => !ids.has(value.toLowerCase()))

  if (missing.length) {
    const created = await productModule.createProductTags(
      missing.map((value) => ({ value }))
    )

    for (const tag of created) {
      ids.set(tag.value.toLowerCase(), tag.id)
      knownIds.add(tag.id)
    }

    logger.info(
      `Product import: created ${created.length} tag(s): ${created
        .map((tag) => tag.value)
        .join(", ")}`
    )
  }

  return { ids, knownIds }
}
