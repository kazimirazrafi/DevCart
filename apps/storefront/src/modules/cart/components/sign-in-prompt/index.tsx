import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { buttonClass } from "@modules/design-system"

const SignInPrompt = () => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border border-ink px-4 py-3">
      <div>
        <h2 className="font-display text-lead font-semibold text-ink">
          Already have an account?
        </h2>
        <p className="text-small text-ink/70">
          Sign in and this cart follows you to your other devices.
        </p>
      </div>
      <LocalizedClientLink
        href="/account"
        className={buttonClass({ variant: "secondary" })}
        data-testid="sign-in-button"
      >
        Sign in
      </LocalizedClientLink>
    </div>
  )
}

export default SignInPrompt
