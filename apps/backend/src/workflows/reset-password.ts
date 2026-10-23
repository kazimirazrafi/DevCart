import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { linkEmailPassIdentityWorkflow } from "./link-emailpass-identity"

export type ResetPasswordWorkflowInput = {
  email: string
  password: string
  jti: string
}

/*
 * The token itself (signature, purpose, actor type) is checked by the API route
 * with the framework's verifier; the stored token row is what proves it is
 * still live and unused, and consuming it here is what makes it single-use.
 */
const consumeResetTokenStep = createStep(
  "consume-reset-token",
  async (input: ResetPasswordWorkflowInput, { container }) => {
    const authModule = container.resolve(Modules.AUTH)

    try {
      await authModule.consumePasswordResetToken({
        jti: input.jti,
        provider: "emailpass",
        entity_id: input.email,
      })
    } catch {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid or expired reset token."
      )
    }

    return new StepResponse({})
  }
)

const updatePasswordStep = createStep(
  "update-password",
  async (input: ResetPasswordWorkflowInput, { container }) => {
    const authModule = container.resolve(Modules.AUTH)

    const { success } = await authModule.updateProvider("emailpass", {
      entity_id: input.email,
      password: input.password,
    })

    if (!success) {
      throw new MedusaError(
        MedusaError.Types.UNAUTHORIZED,
        "Invalid or expired reset token."
      )
    }

    return new StepResponse({})
  }
)

/**
 * Finishes a password reset: spends the token, stores the new password, and
 * associates the identity with the customer who owns the address. The last step
 * is what makes the new password sign in to an existing account (one created
 * with Google, for instance) instead of an identity no customer belongs to.
 */
export const resetPasswordWorkflow = createWorkflow(
  "reset-password",
  (input: ResetPasswordWorkflowInput) => {
    consumeResetTokenStep(input)
    updatePasswordStep(input)
    const link = linkEmailPassIdentityWorkflow.runAsStep({
      input: { email: input.email },
    })

    return new WorkflowResponse(link)
  }
)
