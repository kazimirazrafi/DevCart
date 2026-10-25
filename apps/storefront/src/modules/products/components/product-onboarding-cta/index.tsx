import { cookies as nextCookies } from "next/headers"

import { Link } from "@modules/design-system"

async function ProductOnboardingCta() {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  if (!isOnboarding) {
    return null
  }

  const adminUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""

  return (
    <div
      className="flex flex-col gap-3 border border-ink/30 bg-stock p-4"
      data-testid="onboarding-cta"
    >
      <p className="text-small font-semibold text-ink">
        Your demo product was created successfully.
      </p>
      <p className="text-small text-ink/80">
        You can continue setting up your store in the admin dashboard.
      </p>
      {adminUrl && (
        <Link href={`${adminUrl}/app`} className="self-start text-small">
          Open the admin dashboard
        </Link>
      )}
    </div>
  )
}

export default ProductOnboardingCta
