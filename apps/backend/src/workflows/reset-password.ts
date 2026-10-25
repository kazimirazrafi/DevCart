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
 * The route checks the token's signature; consuming the stored row here is what
 * makes it single-use.
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
 * Spends the token, stores the password and links the identity to the customer,
 * so the new password signs in to an account created through Google too.
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
