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
 * The importer reads tag columns as ids, so tag names are resolved here and the
 * file is rewritten before the workflow runs. Missing tags are created; cells
 * that are already ids pass through, so exported files round-trip.
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
    // The importer's own error names the broken column or row; this must not
    // replace it. The file is imported as uploaded.
    logger.warn(
      `Product import: could not resolve tag values, importing the file as uploaded (${
        (error as Error)?.message ?? error
      })`
    )
  }

  return next()
}

/**
 * Tags the store already has, plus the ones this file introduces. Paged, since
 * a missed page would look like a new tag.
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
