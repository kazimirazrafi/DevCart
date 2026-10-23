"use server"

import { sdk } from "@lib/config"
import medusaErrorMessage from "@lib/util/medusa-error"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import { transferCart } from "./customer"
import {
  getAuthReturnPath,
  getCacheTag,
  removeAuthReturnPath,
  setAuthReturnPath,
  setAuthToken,
} from "./cookies"

export type GoogleSignInState = { state: "error"; error: string } | null

/**
 * Why a Google sign-in did not finish, in the terms the sign-in page has an
 * answer for. The callback route turns each into its own `?auth_error=`, since
 * it answers with a redirect rather than the action's returned state.
 */
export type GoogleFailure = "cancelled" | "email_taken" | "failed"

/** Medusa refuses a second customer record for an email that already has one. */
const ACCOUNT_EXISTS = /already has an account/i

/**
 * The backend without `GOOGLE_CLIENT_ID`: Medusa answers with an instruction for
 * whoever runs the server ("make sure that the provider is registered in the
 * container..."), which is not something a customer can act on.
 */
const PROVIDER_MISSING = /unable to retrieve the auth provider/i

const googleErrorMessage = (error: unknown) =>
  PROVIDER_MISSING.test(error instanceof Error ? error.message : "")
    ? "Google sign-in isn't set up for this store. Use your email and password instead."
    : medusaErrorMessage(error)

/**
 * The `redirect` a protected page left behind, or null. Only a path on this site
 * is kept: the field is attacker-controlled in the form, and `//host` is another
 * origin. The same rule the password forms apply in `customer.ts` — a `"use
 * server"` module can only export async functions, so it is repeated rather than
 * shared.
 */
const safeReturnPath = (value: FormDataEntryValue | null) => {
  const path = typeof value === "string" ? value : ""

  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/account"
  }

  return path
}

/**
 * The claims Medusa puts in a customer's JWT (`generate-jwt-token.ts` in the
 * backend): `actor_id` is the customer the identity is linked to (empty until
 * one is), and `user_metadata` is whatever the auth provider told it — for
 * Google, the profile Google returned.
 *
 * Read rather than verified: the token came from the backend over the wire in
 * this same request, so its contents are what that response says they are. It is
 * never trusted for authorization, only for the two things a first-time Google
 * sign-in needs before the customer exists: the email to create them with and
 * their name.
 */
const claimsOf = (token: string) => {
  const [, payload] = token.split(".")

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    )
    const metadata = claims?.user_metadata ?? {}

    return {
      actorId: typeof claims?.actor_id === "string" ? claims.actor_id : "",
      email: typeof metadata.email === "string" ? metadata.email : null,
      firstName:
        typeof metadata.given_name === "string" ? metadata.given_name : undefined,
      lastName:
        typeof metadata.family_name === "string" ? metadata.family_name : undefined,
    }
  } catch {
    return { actorId: "", email: null, firstName: undefined, lastName: undefined }
  }
}

/**
 * Sign the customer in locally once Google has vouched for them: the auth cookie,
 * the customer cache, and the cart they started before signing in.
 */
async function openSession(token: string) {
  await setAuthToken(token)

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  try {
    await transferCart()
  } catch (error) {
    // The sign-in stands; the cart they had as a guest is what is lost.
    console.error("Could not attach the cart to the account:", error)
  }
}

/**
 * Starts the Google flow: asks the backend for the URL to send the customer to
 * and where they should land afterwards. The provider answers with Google's own
 * consent page, which is a location outside this app — hence the redirect rather
 * than any state this form could hold.
 */
export async function signInWithGoogle(
  _currentState: GoogleSignInState,
  formData: FormData
): Promise<GoogleSignInState> {
  await setAuthReturnPath(safeReturnPath(formData.get("redirect")))

  let result: Awaited<ReturnType<typeof sdk.auth.login>>

  try {
    result = await sdk.auth.login("customer", "google", {})
  } catch (error) {
    await removeAuthReturnPath()
    return { state: "error", error: googleErrorMessage(error) }
  }

  if (typeof result === "object" && result !== null && "location" in result) {
    redirect(result.location)
  }

  // A token instead of a location means this browser already had the identity
  // authenticated. The provider in use answers with a location, but a token is
  // what the SDK's contract allows here, and it is already a signed-in customer.
  if (typeof result === "string") {
    await openSession(result)
    redirect(await takeReturnPath())
  }

  return {
    state: "error",
    error: "Google sign-in could not be started. Try again.",
  }
}

/** The page the customer was on, consumed once and never followed twice. */
async function takeReturnPath() {
  const path = await getAuthReturnPath()
  await removeAuthReturnPath()

  return path && path.startsWith("/") && !path.startsWith("//")
    ? path
    : "/account"
}

export type GoogleCallbackOutcome =
  | { ok: true; returnTo: string }
  | { ok: false; failure: GoogleFailure }

/**
 * Finishes the flow from the query Google came back with. Called by the callback
 * route, which is the only place that can both set the auth cookie and navigate
 * the browser — a page cannot set an httpOnly cookie while it renders.
 */
export async function completeGoogleSignIn(query: {
  code: string
  state: string
}): Promise<GoogleCallbackOutcome> {
  let token: string

  try {
    const result = await sdk.auth.callback("customer", "google", query)

    // MFA and email verification are requirements this flow has no screen for;
    // the same guard the password login uses.
    if (typeof result !== "string") {
      return { ok: false, failure: "failed" }
    }

    token = result
  } catch (error) {
    console.error("Google sign-in callback failed:", error)
    return { ok: false, failure: "failed" }
  }

  const claims = claimsOf(token)

  /*
   * An empty `actor_id` is what a first-time Google customer gets: the auth
   * identity exists, but no customer record is linked to it yet. Creating the
   * customer with that token is what links them, and refreshing mints a token
   * that carries the new id. The password flow reaches the same point by logging
   * in a second time after creating the record.
   */
  if (!claims.actorId) {
    if (!claims.email) {
      console.error("Google sign-in returned no email to create a customer with")
      return { ok: false, failure: "failed" }
    }

    try {
      await sdk.store.customer.create(
        {
          email: claims.email,
          first_name: claims.firstName,
          last_name: claims.lastName,
        },
        {},
        { authorization: `Bearer ${token}` }
      )

      const refreshed = await sdk.auth.refresh({
        authorization: `Bearer ${token}`,
      })

      if (typeof refreshed === "object" && "token" in refreshed) {
        token = refreshed.token
      }
    } catch (error) {
      /*
       * The address already has an account — with a password, or with a Google
       * account that a customer record was never made for. Either way we cannot
       * hand this visitor that account on Google's word alone, so say what to do
       * instead of showing Medusa's sentence about customers and emails.
       */
      return {
        ok: false,
        failure: ACCOUNT_EXISTS.test(medusaErrorMessage(error))
          ? "email_taken"
          : "failed",
      }
    }
  }

  await openSession(token)

  return { ok: true, returnTo: await takeReturnPath() }
}
