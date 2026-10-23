/**
 * The CSV the admin's product importer reads, and the one column it cannot
 * take as written.
 *
 * Medusa parses `Product Tag 1`…`Product Tag 5` as tag **ids** (`{ id: value }`
 * in `CSVNormalizer`), so a file exported from another shop — or written by
 * hand — carries values the importer has never heard of and the whole import
 * fails on the first product with "Tag with id makeup not found". The admin
 * route's middleware (`api/middlewares/resolve-import-tags.ts`) rewrites those
 * cells to ids before the workflow sees the file; this module is the pure half
 * of that, so the parsing and the rewriting are testable without a database.
 */

export type CsvRow = string[]

const BOM = "\uFEFF"

/**
 * RFC 4180: a cell may be quoted, a quoted cell may hold a comma, a newline or
 * a doubled quote, and records end in CRLF or LF. The importer's own parser
 * (`json-2-csv`) accepts more, but a file that round-trips through here has to
 * stay valid for it, so the reader accepts exactly this and nothing clever.
 */
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

  // A file that does not end in a newline still has a last record; an empty
  // trailing line (the common "\r\n" ending) does not.
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

/**
 * The importer reads up to five tag columns, named `Product Tag 1` … `Product
 * Tag 5`; matching is case- and spacing-insensitive because the header a shop
 * exports is not always the one it imported.
 */
export const PRODUCT_TAG_COLUMN = /^product tag \d+$/i

/**
 * A cell that is already a tag id (an exported file, or one written against a
 * store's ids) is passed through untouched: looking it up as a value would
 * create a tag named after the id.
 */
const looksLikeTagId = (value: string) => /^ptag_/i.test(value)

export function tagColumnIndexes(header: CsvRow): number[] {
  return header.reduce<number[]>((indexes, name, index) => {
    if (PRODUCT_TAG_COLUMN.test(name.trim())) {
      indexes.push(index)
    }

    return indexes
  }, [])
}

/**
 * Every distinct tag cell in the file, trimmed and in first-seen order. Blank
 * cells are not values: a product without a tag is a product without a tag.
 */
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
 * Replaces a value with the id a tag already has, or leaves the cell alone when
 * it is blank, already an id, or a value the caller could not resolve. `ids`
 * is keyed by the tag's lowercase value.
 *
 * Ids are recognised by `knownIds` rather than by their `ptag_` prefix: a cell
 * that is already an id must not be looked up as a value, or the next import of
 * an exported CSV would create tags called `ptag_01H…`.
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
