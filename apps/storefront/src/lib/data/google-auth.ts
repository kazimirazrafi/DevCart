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

/** Why a Google sign-in did not finish. The callback route turns each into a ?auth_error= code. */
export type GoogleFailure = "cancelled" | "email_taken" | "failed"

/** Medusa refuses a second customer record for an email that already has one. */
const ACCOUNT_EXISTS = /already has an account/i

/** Without GOOGLE_CLIENT_ID Medusa answers with an instruction for whoever runs the server. */
const PROVIDER_MISSING = /unable to retrieve the auth provider/i

const googleErrorMessage = (error: unknown) =>
  PROVIDER_MISSING.test(error instanceof Error ? error.message : "")
    ? "Google sign-in isn't set up for this store. Use your email and password instead."
    : medusaErrorMessage(error)

/**
 * The redirect a protected page left behind. Only a path on this site is kept:
 * the field is attacker-controlled, and //host is another origin.
 */
const safeReturnPath = (value: FormDataEntryValue | null) => {
  const path = typeof value === "string" ? value : ""

  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/account"
  }

  return path
}

/**
 * The claims in a customer JWT: actor_id links the identity to a customer (empty
 * before one exists), user_metadata carries the provider profile. Read, not
 * verified: the token came from the backend in this same request, and is only
 * used to create a first-time customer.
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

/** Sets the auth cookie, refreshes the customer cache and moves the guest cart over. */
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
 * Asks the backend for Google's consent URL, with the return path kept in a
 * cookie for the callback.
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

  // A token instead of a location means the identity was already authenticated.
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
 * Finishes the flow from the query Google returned. Called by the callback route,
 * the only place that can both set an httpOnly cookie and navigate.
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

  // An empty actor_id means a first-time Google customer: the identity exists but
  // no customer record is linked yet, so create it and refresh the token.
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
      // The address already has an account, with a password or an unlinked Google
      // identity; it cannot be handed over on Google's word alone.
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
