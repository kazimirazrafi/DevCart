import { ExecArgs } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"

/**
 * Resets an existing admin password and checks it by signing in. Reads
 * ADMIN_EMAIL and ADMIN_PASSWORD; neither is stored in the file.
 */
export default async function setAdminPassword({ container }: ExecArgs) {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Set ADMIN_EMAIL and ADMIN_PASSWORD before running this."
    )
  }

  const auth = container.resolve(Modules.AUTH)

  // `ADMIN_VERIFY_ONLY=1` skips the write, which is how an existing account's
  // password can be tested without replacing it.
  if (process.env.ADMIN_VERIFY_ONLY !== "1") {
    const updated = await auth.updateProvider("emailpass", {
      entity_id: email,
      password,
    })

    console.log(
      `UPDATE ${email}: ${updated.success ? "stored" : `failed (${updated.error})`}`
    )
  }

  const signedIn = await auth.authenticate("emailpass", {
    body: { email, password },
  })

  console.log(
    `SIGN-IN ${email}: ${signedIn.success ? "works" : `refused (${signedIn.error})`}`
  )
}
