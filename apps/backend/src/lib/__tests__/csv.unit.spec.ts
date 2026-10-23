import {
  parseCsv,
  rewriteTagCells,
  stringifyCsv,
  tagColumnIndexes,
  tagValues,
} from "../csv"

describe("parseCsv", () => {
  it("reads a plain record", () => {
    expect(parseCsv("a,b\r\n1,2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ])
  })

  it("keeps commas, quotes and newlines inside quoted cells", () => {
    const rows = parseCsv(
      'a,b\r\n"one, two","he said ""hi"" on\r\ntwo lines"\r\n'
    )

    expect(rows[1]).toEqual([
      "one, two",
      'he said "hi" on\r\ntwo lines',
    ])
  })

  it("drops the byte-order mark a spreadsheet writes", () => {
    expect(parseCsv("\uFEFFa,b\r\n1,2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ])
  })

  it("does not invent a row from the final newline", () => {
    expect(parseCsv("a\r\n1\r\n")).toHaveLength(2)
  })

  it("round-trips through stringifyCsv", () => {
    const rows = [
      ["a", "b"],
      ["one, two", 'say "hi"'],
      ["padded ", "line\nbreak"],
    ]

    expect(parseCsv(stringifyCsv(rows))).toEqual(rows)
  })
})

describe("tag columns", () => {
  const header = ["Product Handle", "Product Tag 1", "Product Tag 2", "Price"]

  it("finds the tag columns by name, whatever their case", () => {
    expect(tagColumnIndexes(header)).toEqual([1, 2])
    expect(tagColumnIndexes(["product tag 1", "x"])).toEqual([0])
    expect(tagColumnIndexes(["Product Tags", "x"])).toEqual([])
  })

  it("collects distinct values, trimmed, skipping blanks and ids", () => {
    const rows = [
      header,
      ["one", "makeup", "", "1"],
      ["two", " Makeup ", "footwear", "2"],
      ["three", "ptag_01HXYZ", "", "3"],
    ]

    expect(tagValues(rows)).toEqual(["makeup", "footwear"])
  })

  it("rewrites values to ids and leaves ids, blanks and unknowns alone", () => {
    const rows = [
      header,
      ["one", "makeup", "footwear", "1"],
      ["two", "ptag_01HXYZ", "", "2"],
    ]

    const rewritten = rewriteTagCells(
      rows,
      new Map([
        ["makeup", "ptag_makeup"],
        ["footwear", "ptag_footwear"],
      ]),
      new Set(["ptag_01HXYZ"])
    )

    expect(rewritten[1]).toEqual([
      "one",
      "ptag_makeup",
      "ptag_footwear",
      "1",
    ])
    expect(rewritten[2]).toEqual(["two", "ptag_01HXYZ", "", "2"])
    // The source is not mutated.
    expect(rows[1][1]).toBe("makeup")
  })
})
