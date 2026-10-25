/**
 * The importer reads tag and category columns as ids, so imported files are
 * rewritten before the workflow runs. This is the pure half of that work:
 * parsing and rewriting, testable without a database.
 */

export type CsvRow = string[]

const BOM = "\uFEFF"

/** RFC 4180: quoted cells may hold commas, newlines and doubled quotes. */
export function parseCsv(text: string): CsvRow[] {
  const source = text.startsWith(BOM) ? text.slice(BOM.length) : text

  const rows: CsvRow[] = []
  let row: CsvRow = []
  let cell = ""
  let quoted = false

  for (let i = 0; i < source.length; i++) {
    const char = source[i]

    if (quoted) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          cell += '"'
          i++
        } else {
          quoted = false
        }
      } else {
        cell += char
      }

      continue
    }

    if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(cell)
      cell = ""
    } else if (char === "\r") {
      // Consumed with the following "\n"; a lone CR ends the record too.
      if (source[i + 1] === "\n") {
        i++
      }
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else if (char === "\n") {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else {
      cell += char
    }
  }

  // A file without a trailing newline still has a last record.
  if (cell !== "" || row.length) {
    row.push(cell)
    rows.push(row)
  }

  return rows
}

const needsQuotes = (cell: string) =>
  /[",\r\n]/.test(cell) || /^\s|\s$/.test(cell)

export function stringifyCsv(rows: CsvRow[]): string {
  return rows
    .map((row) =>
      row
        .map((cell) =>
          needsQuotes(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
        )
        .join(",")
    )
    .join("\r\n")
}

/** Tag columns are `Product Tag 1`..`5`, matched case-insensitively. */
export const PRODUCT_TAG_COLUMN = /^product tag \d+$/i

/** An id must not be looked up as a value, or it becomes a tag named after it. */
const looksLikeTagId = (value: string) => /^ptag_/i.test(value)

export function tagColumnIndexes(header: CsvRow): number[] {
  return header.reduce<number[]>((indexes, name, index) => {
    if (PRODUCT_TAG_COLUMN.test(name.trim())) {
      indexes.push(index)
    }

    return indexes
  }, [])
}

/** Distinct tag values, trimmed and in first-seen order. */
export function tagValues(rows: CsvRow[]): string[] {
  if (!rows.length) {
    return []
  }

  const columns = tagColumnIndexes(rows[0])
  const seen = new Set<string>()
  const values: string[] = []

  for (const row of rows.slice(1)) {
    for (const column of columns) {
      const value = (row[column] ?? "").trim()

      if (!value || looksLikeTagId(value)) {
        continue
      }

      const key = value.toLowerCase()

      if (!seen.has(key)) {
        seen.add(key)
        values.push(value)
      }
    }
  }

  return values
}

/**
 * Replaces known values with tag ids. Blank cells, ids and unresolved values
 * are left alone; `ids` is keyed by lowercase value.
 */
export function rewriteTagCells(
  rows: CsvRow[],
  ids: Map<string, string>,
  knownIds: Set<string>
): CsvRow[] {
  if (!rows.length) {
    return rows
  }

  const columns = tagColumnIndexes(rows[0])

  if (!columns.length) {
    return rows
  }

  return rows.map((row, rowIndex) => {
    if (rowIndex === 0) {
      return row
    }

    const next = [...row]

    for (const column of columns) {
      const cell = (row[column] ?? "").trim()

      if (!cell || knownIds.has(cell) || looksLikeTagId(cell)) {
        continue
      }

      const id = ids.get(cell.toLowerCase())

      if (id) {
        next[column] = id
      }
    }

    return next
  })
}

/** Category columns are `Product Category 1`..`N`, also read as ids. */
export const PRODUCT_CATEGORY_COLUMN = /^product category \d+$/i

/** One `Product Category` cell may hold several names, separated by `|` or `;`. */
export const PRODUCT_CATEGORY_NAME_COLUMN = /^product category(?:\s+name)?$/i

/** An id must not be looked up as a name, or it becomes a category named after it. */
const looksLikeCategoryId = (value: string) => /^pcat_/i.test(value)

const categoryNames = (cell: string | undefined): string[] =>
  (cell ?? "")
    .split(/[|;]/)
    .map((name) => name.trim())
    .filter(Boolean)

export function categoryColumnIndexes(header: CsvRow): number[] {
  return header.reduce<number[]>((indexes, name, index) => {
    if (PRODUCT_CATEGORY_COLUMN.test(name.trim())) {
      indexes.push(index)
    }

    return indexes
  }, [])
}

/**
 * Rewrites category cells into the numbered form, so one `Product Category`
 * column becomes `Product Category 1..N`.
 */
export function normalizeCategoryColumns(rows: CsvRow[]): CsvRow[] {
  if (!rows.length) {
    return rows
  }

  const header = rows[0]
  const nameIndexes = header.reduce<number[]>((indexes, name, index) => {
    if (PRODUCT_CATEGORY_NAME_COLUMN.test(name.trim())) {
      indexes.push(index)
    }

    return indexes
  }, [])

  if (!nameIndexes.length) {
    return rows
  }

  const namesPerRow = rows.slice(1).map((row) => [
    ...nameIndexes.flatMap((index) => categoryNames(row[index])),
    ...categoryColumnIndexes(header).flatMap((index) => categoryNames(row[index])),
  ])
  const width = namesPerRow.reduce((widest, names) => Math.max(widest, names.length), 0)

  if (!width) {
    return rows
  }

  const at = Math.min(...nameIndexes)
  const drop = new Set([...nameIndexes, ...categoryColumnIndexes(header)])
  const canonical = Array.from(
    { length: width },
    (_, index) => `Product Category ${index + 1}`
  )

  const headerOut = header.flatMap((name, index) => {
    if (index === at) {
      return canonical
    }

    return drop.has(index) ? [] : [name]
  })

  const rowsOut = rows.slice(1).map((row, rowIndex) => {
    const names = namesPerRow[rowIndex]
    const cells = row.flatMap((cell, index) => {
      if (index === at) {
        return canonical.map((_, position) => names[position] ?? "")
      }

      return drop.has(index) ? [] : [cell]
    })

    return cells
  })

  return [headerOut, ...rowsOut]
}

/** Distinct category names, trimmed and in first-seen order. */
export function categoryValues(rows: CsvRow[]): string[] {
  if (rows.length < 2) {
    return []
  }

  const columns = categoryColumnIndexes(rows[0])
  const seen = new Set<string>()
  const values: string[] = []

  for (const row of rows.slice(1)) {
    for (const column of columns) {
      const value = (row[column] ?? "").trim()

      if (!value || looksLikeCategoryId(value)) {
        continue
      }

      const key = value.toLowerCase()

      if (!seen.has(key)) {
        seen.add(key)
        values.push(value)
      }
    }
  }

  return values
}

/**
 * Replaces resolved names with category ids. Blank cells, ids and unresolved
 * names are left alone; `ids` is keyed by lowercase name.
 */
export function rewriteCategoryCells(
  rows: CsvRow[],
  ids: Map<string, string>,
  knownIds: Set<string>
): CsvRow[] {
  if (!rows.length) {
    return rows
  }

  const columns = categoryColumnIndexes(rows[0])

  if (!columns.length) {
    return rows
  }

  return rows.map((row, rowIndex) => {
    if (rowIndex === 0) {
      return row
    }

    const next = [...row]

    for (const column of columns) {
      const cell = (row[column] ?? "").trim()

      if (!cell || knownIds.has(cell) || looksLikeCategoryId(cell)) {
        continue
      }

      const id = ids.get(cell.toLowerCase())

      if (id) {
        next[column] = id
      }
    }

    return next
  })
}
