import { completeGoogleSignIn, type GoogleFailure } from "@lib/data/google-auth"
import { NextRequest, NextResponse } from "next/server"

/**
 * Where Google returns and the sign-in finishes. Under /api because middleware
 * does not run there (the route must work signed out) and the URL carries no
 * country code, so one redirect URI serves every region. Failures redirect back
 * to the sign-in page.
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

  // No code means the customer closed the consent screen, which is a cancel,
  // not a failure.
  if (!code || !state) {
    return backToSignIn(request, FAILURE_PARAM.cancelled)
  }

  const outcome = await completeGoogleSignIn({ code, state })

  if (!outcome.ok) {
    return backToSignIn(request, FAILURE_PARAM[outcome.failure])
  }

  return NextResponse.redirect(new URL(outcome.returnTo, request.nextUrl.origin))
}
