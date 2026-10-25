import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import { GET } from "../ready/route"

/*
 * Both answers without a database: a failed read is a 503, and the reason stays
 * in the log.
 */
const response = () => {
  const state: {
    status: number
    headers: Record<string, string>
    body?: Record<string, unknown>
  } = { status: 200, headers: {} }

  const res = {
    state,
    setHeader(key: string, value: string) {
      state.headers[key] = value
      return res
    },
    status(code: number) {
      state.status = code
      return res
    },
    json(body: Record<string, unknown>) {
      state.body = body
      return res
    },
  }

  return res
}

const request = (db: { raw: () => Promise<unknown> }) => {
  const logger = { error: jest.fn() }

  const req = {
    scope: {
      resolve: (key: string) =>
        key === ContainerRegistrationKeys.LOGGER ? logger : db,
    },
  }

  return { req: req as never, logger }
}

describe("GET /health/ready", () => {
  it("answers 200 when the database answers", async () => {
    const db = { raw: jest.fn().mockResolvedValue([{ "?column?": 1 }]) }
    const { req } = request(db)
    const res = response()

    await GET(req, res as never)

    expect(res.state.status).toBe(200)
    expect(res.state.body).toMatchObject({ status: "ok", database: "up" })
    expect(typeof res.state.body?.latency_ms).toBe("number")
    expect(res.state.headers["Cache-Control"]).toBe("no-store")
  })

  it("answers 503, and keeps the reason out of the body, when it does not", async () => {
    const db = {
      raw: jest.fn().mockRejectedValue(new Error("connect ECONNREFUSED")),
    }
    const { req, logger } = request(db)
    const res = response()

    await GET(req, res as never)

    expect(res.state.status).toBe(503)
    expect(res.state.body).toMatchObject({
      status: "unavailable",
      database: "down",
    })
    expect(JSON.stringify(res.state.body)).not.toContain("ECONNREFUSED")
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("ECONNREFUSED")
    )
  })
})
