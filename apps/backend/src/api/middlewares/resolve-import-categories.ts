import {
  MedusaNextFunction,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  IFileModuleService,
  IProductModuleService,
  Logger,
  ProductCategoryDTO,
} from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import {
  categoryValues,
  normalizeCategoryColumns,
  parseCsv,
  rewriteCategoryCells,
  stringifyCsv,
} from "../../lib/csv"

type ImportBody = {
  file_key?: string
  originalname?: string
  size?: number
}

/**
 * The importer reads category columns as ids, so names are resolved here and
 * the file is rewritten before the workflow runs. Missing categories are
 * created; paths like `Home & Kitchen/Kitchen Accessories` are walked part by
 * part. Cells that already hold ids are left alone.
 */
export async function resolveImportCategories(
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
    const rows = normalizeCategoryColumns(parseCsv(contents.toString("utf-8")))
    const values = categoryValues(rows)

    if (!values.length) {
      return next()
    }

    const productModule =
      req.scope.resolve<IProductModuleService>(Modules.PRODUCT)
    const { ids, knownIds } = await resolveCategoryIds(
      productModule,
      values,
      logger
    )

    const rewritten = stringifyCsv(rewriteCategoryCells(rows, ids, knownIds))
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
      `Product import: ${values.length} category name(s) in the file, ${ids.size} resolved, importing ${file.id}`
    )
  } catch (error) {
    // The importer's own error names the broken column or row, so this must
    // not replace it. The file is imported as uploaded.
    logger.warn(
      `Product import: could not resolve category names, importing the file as uploaded (${
        (error as Error)?.message ?? error
      })`
    )
  }

  return next()
}

/** `Home & Kitchen/Kitchen Accessories` and the same written with `>`. */
const pathParts = (value: string): string[] =>
  value
    .split(/[/>]/)
    .map((part) => part.trim())
    .filter(Boolean)

const normalize = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, " ")

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

/**
 * Ids for every category the file names, creating missing ones. Lookups match
 * name, handle and parent/child path, and the listing is paged because a
 * missed page would look like a new category.
 */
async function resolveCategoryIds(
  productModule: IProductModuleService,
  values: string[],
  logger: Logger
): Promise<{ ids: Map<string, string>; knownIds: Set<string> }> {
  const ids = new Map<string, string>()
  const knownIds = new Set<string>()
  const take = 200

  for (let skip = 0; ; skip += take) {
    const page = await productModule.listProductCategories(
      {},
      { take, skip, relations: ["parent_category"] }
    )

    for (const category of page) {
      registerCategory(category, ids, knownIds)
    }

    if (page.length < take) {
      break
    }
  }

  const unknown = values.filter((value) => !ids.has(normalize(value)))
  const created: ProductCategoryDTO[] = []

  for (const value of unknown) {
    let parentId: string | undefined
    let category: ProductCategoryDTO | undefined

    for (const part of pathParts(value)) {
      const existingId = ids.get(normalize(part))

      if (existingId) {
        parentId = existingId
        category = undefined
        continue
      }

      category = await productModule.createProductCategories({
        name: part,
        handle: slugify(part),
        parent_category_id: parentId,
        is_active: true,
        is_internal: false,
      })

      created.push(category)
      registerCategory(category, ids, knownIds)
      parentId = category.id
    }

    // A path resolves to its leaf; a single name to the category itself.
    if (category) {
      ids.set(normalize(value), category.id)
    }
  }

  if (created.length) {
    logger.info(
      `Product import: created ${created.length} categor${
        created.length === 1 ? "y" : "ies"
      }: ${created.map((category) => category.name).join(", ")}`
    )
  }

  return { ids, knownIds }
}

function registerCategory(
  category: ProductCategoryDTO,
  ids: Map<string, string>,
  knownIds: Set<string>
) {
  ids.set(normalize(category.name), category.id)
  ids.set(normalize(category.handle), category.id)
  knownIds.add(category.id)

  const parent = category.parent_category

  if (parent?.handle) {
    ids.set(`${normalize(parent.handle)}/${normalize(category.handle)}`, category.id)
  }

  if (parent?.name) {
    ids.set(`${normalize(parent.name)}/${normalize(category.name)}`, category.id)
  }
}
