import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"

type LinkEmailPassIdentityInput = {
  email: string
}

type LinkEmailPassIdentityOutput = {
  linked: boolean
}

/*
 * A customer who signed up with Google has no password, and Medusa's emailpass
 * register creates a second identity without `app_metadata.customer_id`. This
 * step attaches it to the existing customer. Only safe after the address has
 * been proven, so it runs on password reset only, never on login or register.
 */
const linkEmailPassIdentityStep = createStep(
  "link-email-pass-identity",
  async (input: LinkEmailPassIdentityInput, { container }) => {
    const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
    const authModule = container.resolve(Modules.AUTH)
    const customerModule = container.resolve(Modules.CUSTOMER)

    const [providerIdentity] = await authModule.listProviderIdentities({
      provider: "emailpass",
      entity_id: input.email,
    })

    if (!providerIdentity?.auth_identity_id) {
      return new StepResponse<LinkEmailPassIdentityOutput>({ linked: false })
    }

    const [customer] = await customerModule.listCustomers({
      email: input.email,
    })

    // No customer yet: normal registration links the identity on create.
    if (!customer) {
      return new StepResponse<LinkEmailPassIdentityOutput>({ linked: false })
    }

    const identity = await authModule.retrieveAuthIdentity(
      providerIdentity.auth_identity_id,
      { select: ["id", "app_metadata"] }
    )

    if (identity.app_metadata?.customer_id) {
      return new StepResponse<LinkEmailPassIdentityOutput>({ linked: false })
    }

    await authModule.updateAuthIdentities({
      id: identity.id,
      app_metadata: {
        ...identity.app_metadata,
        customer_id: customer.id,
      },
    })

    logger.info(
      `Linked the emailpass identity for ${input.email} to customer ${customer.id}.`
    )

    return new StepResponse<LinkEmailPassIdentityOutput>({ linked: true })
  }
)

export const linkEmailPassIdentityWorkflow = createWorkflow(
  "link-email-pass-identity",
  (input: LinkEmailPassIdentityInput) => {
    const result = linkEmailPassIdentityStep(input)

    return new WorkflowResponse(result)
  }
)
