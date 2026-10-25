import { Client } from "pg"

import { databaseUrl } from "./env"

// The code is stored on the notification row before the provider is called, so a
// test can type back what a customer would have read. Newest row only: a resend
// replaces the code.
export async function verificationCodeFor(
  email: string,
  timeoutMs = 30_000
): Promise<string> {
  if (!databaseUrl) {
    throw new Error(
      "No database URL for the E2E run: set DATABASE_URL in apps/backend/.env or E2E_DATABASE_URL."
    )
  }

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    const deadline = Date.now() + timeoutMs

    while (Date.now() < deadline) {
      const { rows } = await client.query<{ code: string | null }>(
        `select data->>'code' as code
           from notification
          where "to" = $1 and template = 'email-verification'
          order by created_at desc
          limit 1`,
        [email]
      )

      const code = rows[0]?.code

      if (code) {
        return code
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    throw new Error(`No verification code was issued for ${email}.`)
  } finally {
    await client.end()
  }
}
