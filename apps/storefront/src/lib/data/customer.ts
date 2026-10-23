"use server"

import { sdk } from "@lib/config"
import medusaErrorMessage, { medusaError } from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { FetchError } from "@medusajs/js-sdk"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartId,
  getPendingCustomer,
  removeAuthToken,
  removeCartId,
  removePendingCustomer,
  setAuthToken,
  setPendingCustomer,
} from "./cookies"

export type CustomerAuthState =
  | { state: "error"; error: string }
  /** The email is already an account whose password is not the one submitted. */
  | { state: "exists"; email: string }
  | { state: "verification_required"; email: string }
  | { state: "success" }
  | null

// Requests a verification email for the given customer. The request must be
// authenticated with a token tied to the auth identity (the token returned by
// register or by a login that requires verification).
async function requestVerificationEmail(email: string, token: string) {
  await sdk.auth.verification.request(
    {
      entity_id: email,
      entity_type: "email",
    },
    {
      authorization: `Bearer ${token}`,
    }
  )
}

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders",
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

/*
 * Whether the API rejected the submission because that email already has an
 * identity. Medusa answers `401 Identity with email already exists` for it. The
 * message is matched rather than a code because the SDK drops error codes (see
 * `lib/util/medusa-error.ts`).
 */
const isDuplicateIdentity = (error: unknown) => {
  const fetchError = error as FetchError

  return (
    fetchError.statusText === "Unauthorized" &&
    fetchError.message === "Identity with email already exists"
  )
}

/**
 * Where to send the customer once they are signed in. A protected page leaves
 * this behind as `?redirect=` (see `middleware.ts`), and the form carries it as
 * a hidden field — so it is only ever followed when it names a path on this
 * site. A second `//` would make it another origin.
 */
const afterSignIn = (formData: FormData) => {
  const value = formData.get("redirect")

  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return null
  }

  return value
}

/** The auth token for these credentials, or null if they do not match. */
async function tryLogin(email: string, password: string) {
  const result = await sdk.auth
    .login("customer", "emailpass", { email, password })
    .catch(() => null)

  return typeof result === "string" ? result : null
}

export async function signup(
  _currentState: unknown,
  formData: FormData
): Promise<CustomerAuthState> {
  const password = formData.get("password") as string
  const customerForm = {
    email: formData.get("email") as string,
    first_name: formData.get("first_name") as string,
    last_name: formData.get("last_name") as string,
    phone: formData.get("phone") as string,
  }

  // Signing up with an email that already has an identity is answered with the
  // credentials that were just typed. The password decides what it means:
  //
  //  - it matches (an admin user with this email, or someone re-submitting their
  //    own signup) -> carry on and log in, which is the starter's behaviour and
  //    still links a customer record;
  //  - it does not match -> the email is somebody else's account, and saying
  //    "invalid email or password" here would send them hunting for a typo in a
  //    form that never had a working password. `exists` says what happened.
  let authorizedToken: string | undefined

  try {
    await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password,
    })
  } catch (error) {
    if (!isDuplicateIdentity(error)) {
      return { state: "error", error: medusaErrorMessage(error) }
    }

    const token = await tryLogin(customerForm.email, password)

    if (!token) {
      return { state: "exists", email: customerForm.email }
    }

    authorizedToken = token
  }

  // Persist the extra signup fields. The customer record is created during
  // login, which is deferred until after email verification when the backend
  // requires it.
  await setPendingCustomer(customerForm)

  // Continue by logging in. The login response tells us whether the backend
  // requires email verification — we don't need a storefront-side flag.
  return finishAuth(formData, await completeLogin(customerForm.email, password, authorizedToken))
}

export async function login(
  _currentState: unknown,
  formData: FormData
): Promise<CustomerAuthState> {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  return finishAuth(formData, await completeLogin(email, password))
}

/**
 * Sends a signed-in customer to the page that asked for them. Done here rather
 * than in the form's effect because a `router.push` followed by the refresh the
 * new session needs would cancel the navigation — measured: signing in from a
 * protected page left the customer on the sign-in URL.
 */
function finishAuth(
  formData: FormData,
  result: CustomerAuthState
): CustomerAuthState {
  if (result?.state === "success") {
    const target = afterSignIn(formData)

    if (target) {
      redirect(target)
    }
  }

  return result
}

// Logs the customer in and reconciles the customer record. The behavior is
// driven entirely by the backend's login response, so it works whether or not
// email verification is enabled.
async function completeLogin(
  email: string,
  password: string,
  authorizedToken?: string
): Promise<CustomerAuthState> {
  let result: Awaited<ReturnType<typeof sdk.auth.login>> | string

  if (authorizedToken) {
    result = authorizedToken
  } else {
    try {
      result = await sdk.auth.login("customer", "emailpass", {
        email,
        password,
      })
    } catch (error) {
      // 401 for both a wrong password and an unknown address, which is what the
      // customer is told — either way the fix is the same.
      return { state: "error", error: medusaErrorMessage(error) }
    }
  }

  // A `location` is returned by third-party auth providers, which this flow
  // doesn't support.
  if (typeof result === "object" && "location" in result) {
    return {
      state: "error",
      error: "This login method isn't supported by the storefront.",
    }
  }

  // The backend requires email verification and the customer hasn't verified
  // yet. Send the verification email and ask them to check their inbox.
  if (
    typeof result === "object" &&
    "verification_required" in result &&
    result.verification_required
  ) {
    try {
      await requestVerificationEmail(email, result.token)
    } catch {
      // Ignore: the customer can resend from the verification page.
    }
    return { state: "verification_required", email }
  }

  if (typeof result !== "string") {
    return {
      state: "error",
      error: "Authentication requires additional steps that aren't supported.",
    }
  }

  let token = result

  // The token may not be tied to a customer record yet — right after
  // registration, or after verifying a brand-new account. Ask the backend:
  // `/store/customers/me` rejects tokens without a registered actor, so a
  // failed retrieve means we still need to create the customer, then log in
  // again to obtain a customer-bound token.
  const customerExists = await sdk.store.customer
    .retrieve({}, { authorization: `Bearer ${token}` })
    .then(() => true)
    .catch(() => false)

  if (!customerExists) {
    const pending = await getPendingCustomer()

    try {
      await sdk.store.customer.create(
        {
          email,
          first_name: pending?.first_name,
          last_name: pending?.last_name,
          phone: pending?.phone,
        },
        {},
        { authorization: `Bearer ${token}` }
      )

      token = (await sdk.auth.login("customer", "emailpass", {
        email,
        password,
      })) as string
    } catch (error) {
      /*
       * Medusa refuses a second account for an email that already has one
       * ("Customer with this email already has an account"). That is the same
       * situation the register form reports as `exists`, so it gets the same
       * answer instead of a raw API sentence.
       */
      if (/already has an account/i.test(medusaErrorMessage(error))) {
        return { state: "exists", email }
      }

      return { state: "error", error: medusaErrorMessage(error) }
    }

    await removePendingCustomer()
  }

  await setAuthToken(token)

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  try {
    await transferCart()
  } catch (error) {
    return { state: "error", error: medusaErrorMessage(error) }
  }

  return { state: "success" }
}

// Confirms a customer's email using the token from the verification link.
//
// The confirm route doesn't require authentication, so this works even when the
// customer opens the link on a different device than the one they signed up on.
export async function confirmEmailVerification(
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await sdk.auth.verification.confirm({ code: token })
    return { success: true }
  } catch (error) {
    return { success: false, error: String(error) }
  }
}

export async function signout(countryCode: string) {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  redirect(`/${countryCode}/account`)
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  await sdk.store.cart.transferCart(cartId, {}, headers)

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
}

/*
 * A profile edit's result (A4). Same shape as the address mutations below:
 * failures are returned, not thrown, because a production build replaces a
 * thrown server-action message with generic copy (see `lib/util/medusa-error.ts`),
 * and field errors are keyed by the input's name so the form can place each
 * message next to the field it belongs to.
 */
export type CustomerProfileState =
  | { ok: true }
  | { ok: false; message: string; fields?: Record<string, string> }
  | null

const PROFILE_REVIEW = "Check the fields below and try again."

/**
 * The name on the account. Both parts are required by the storefront's forms
 * and trimmed here, so a whitespace-only field is refused rather than stored
 * as a blank name.
 */
export const updateCustomerName = async (
  _currentState: CustomerProfileState,
  formData: FormData
): Promise<CustomerProfileState> => {
  const first_name = String(formData.get("first_name") ?? "").trim()
  const last_name = String(formData.get("last_name") ?? "").trim()
  const fields: Record<string, string> = {}

  if (!first_name) {
    fields.first_name = "Enter a first name."
  }

  if (!last_name) {
    fields.last_name = "Enter a last name."
  }

  if (Object.keys(fields).length) {
    return { ok: false, message: PROFILE_REVIEW, fields }
  }

  try {
    await updateCustomer({ first_name, last_name })
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  return { ok: true }
}

/**
 * The phone number is optional. Empty is sent as null rather than "" so the
 * profile keeps showing "Not set" instead of a blank where the number belongs,
 * and a number that could not be dialled (letters, an unclosed bracket) is
 * refused before it reaches the API.
 */
export const updateCustomerPhone = async (
  _currentState: CustomerProfileState,
  formData: FormData
): Promise<CustomerProfileState> => {
  const phone = String(formData.get("phone") ?? "").trim()

  if (phone && !/^\+?[0-9()\s.-]{4,32}$/.test(phone)) {
    return {
      ok: false,
      message: PROFILE_REVIEW,
      fields: { phone: "Use digits, spaces, or + - ( )." },
    }
  }

  try {
    await updateCustomer({ phone: phone || null })
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  return { ok: true }
}

/*
 * What an address form action reports back. Failures are returned, not thrown:
 * a production build replaces a thrown server-action message with generic copy
 * (see `lib/util/medusa-error.ts`). Field errors are keyed by the input's name so
 * the form can place each message next to the field it belongs to.
 */
export type CustomerAddressState =
  | { ok: true }
  | { ok: false; message: string; fields?: Record<string, string> }
  | null

/** A non-null result of a one-click address action (delete, set default). */
export type CustomerAddressResult =
  | { ok: true }
  | { ok: false; message: string }

export type AddressDefaultField = "shipping" | "billing"

/** The fields the form holds. Optional ones are empty strings, never null. */
export type AddressFormValues = {
  first_name: string
  last_name: string
  company: string
  address_1: string
  address_2: string
  city: string
  postal_code: string
  province: string
  country_code: string
  phone: string
}

const REQUIRED_ADDRESS_FIELDS: [keyof AddressFormValues, string][] = [
  ["first_name", "Enter a first name."],
  ["last_name", "Enter a last name."],
  ["address_1", "Enter a street address."],
  ["city", "Enter a city."],
  ["postal_code", "Enter a postal code."],
  ["country_code", "Choose a country."],
]

const readAddress = (formData: FormData): AddressFormValues => {
  const text = (name: string) => String(formData.get(name) ?? "").trim()

  return {
    first_name: text("first_name"),
    last_name: text("last_name"),
    company: text("company"),
    address_1: text("address_1"),
    address_2: text("address_2"),
    city: text("city"),
    postal_code: text("postal_code"),
    province: text("province"),
    country_code: text("country_code").toLowerCase(),
    phone: text("phone"),
  }
}

const addressErrors = (values: AddressFormValues) => {
  const fields: Record<string, string> = {}

  for (const [field, message] of REQUIRED_ADDRESS_FIELDS) {
    if (!values[field]) {
      fields[field] = message
    }
  }

  return fields
}

/** Empty optional fields are sent as null, so they stay unset in the API. */
const addressPayload = (values: AddressFormValues) => ({
  ...values,
  company: values.company || null,
  address_2: values.address_2 || null,
  province: values.province || null,
  phone: values.phone || null,
})

const revalidateCustomerCache = async () => {
  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)
}

const ADDRESS_REVIEW = "Check the fields below and try again."

export const addCustomerAddress = async (
  _currentState: CustomerAddressState,
  formData: FormData
): Promise<CustomerAddressState> => {
  const values = readAddress(formData)
  const fields = addressErrors(values)

  if (Object.keys(fields).length) {
    return { ok: false, message: ADDRESS_REVIEW, fields }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.customer.createAddress(
      {
        ...addressPayload(values),
        is_default_shipping: formData.get("is_default_shipping") === "on",
        is_default_billing: formData.get("is_default_billing") === "on",
      },
      {},
      headers
    )
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  await revalidateCustomerCache()

  return { ok: true }
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<CustomerAddressResult> => {
  if (!addressId) {
    return { ok: false, message: "This address could not be found." }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.customer.deleteAddress(addressId, headers)
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  await revalidateCustomerCache()

  return { ok: true }
}

export const updateCustomerAddress = async (
  _currentState: CustomerAddressState,
  formData: FormData
): Promise<CustomerAddressState> => {
  const addressId = String(formData.get("addressId") ?? "")

  if (!addressId) {
    return {
      ok: false,
      message: "This address could not be found. Reload the page and try again.",
    }
  }

  const values = readAddress(formData)
  const fields = addressErrors(values)

  if (Object.keys(fields).length) {
    return { ok: false, message: ADDRESS_REVIEW, fields }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    // Default flags are deliberately not written here: the form does not edit
    // them, and sending `false` would clear a default instead of leaving it.
    await sdk.store.customer.updateAddress(
      addressId,
      addressPayload(values),
      {},
      headers
    )
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  await revalidateCustomerCache()

  return { ok: true }
}

/**
 * Makes one saved address the default for shipping or billing. Medusa's own
 * update workflow clears the previous default, so there is never more than one
 * of each.
 */
export const setDefaultCustomerAddress = async (
  addressId: string,
  field: AddressDefaultField
): Promise<CustomerAddressResult> => {
  if (!addressId) {
    return { ok: false, message: "This address could not be found." }
  }

  if (field !== "shipping" && field !== "billing") {
    return { ok: false, message: "That default could not be changed." }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  try {
    await sdk.store.customer.updateAddress(
      addressId,
      field === "shipping"
        ? { is_default_shipping: true }
        : { is_default_billing: true },
      {},
      headers
    )
  } catch (error) {
    return { ok: false, message: medusaErrorMessage(error) }
  }

  await revalidateCustomerCache()

  return { ok: true }
}
