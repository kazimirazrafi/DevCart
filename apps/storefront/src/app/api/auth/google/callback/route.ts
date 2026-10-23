import { completeGoogleSignIn, type GoogleFailure } from "@lib/data/google-auth"
import { NextRequest, NextResponse } from "next/server"

/**
 * Where Google sends the customer back to, and where the sign-in is finished.
 *
 * It lives under `/api` for two reasons: `middleware.ts` does not run there, so
 * the route is reachable while signed out — which is the whole point — and its
 * URL carries no country code, so the same redirect URI works for every region
 * and is the one URL to allow-list on the OAuth client. The country is put back
 * by the middleware on the way out.
 *
 * The outcome is reported as a redirect to the sign-in page rather than a page
 * of its own: the customer's next move is always to try again, sign in with
 * their password, or nothing.
 */
const FAILURE_PARAM: Record<GoogleFailure, string> = {
  cancelled: "google_cancelled",
  email_taken: "google_email_taken",
  failed: "google_failed",
}

const backToSignIn = (request: NextRequest, error: string) => {
  const url = new URL("/account", request.nextUrl.origin)
  url.searchParams.set("auth_error", error)

  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const code = params.get("code")
  const state = params.get("state")

  /*
   * Google answers a refusal itself, with `error=access_denied` and no code —
   * the customer closing the consent screen is the common case, not a failure of
   * ours, so it reads as "cancelled" rather than as something broken.
   */
  if (!code || !state) {
    return backToSignIn(request, FAILURE_PARAM.cancelled)
  }

  const outcome = await completeGoogleSignIn({ code, state })

  if (!outcome.ok) {
    return backToSignIn(request, FAILURE_PARAM[outcome.failure])
  }

  return NextResponse.redirect(new URL(outcome.returnTo, request.nextUrl.origin))
}
