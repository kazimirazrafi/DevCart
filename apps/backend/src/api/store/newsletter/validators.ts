import { z } from "@medusajs/framework/zod"

/*
 * The only thing a signup may carry is the address. There is no customer id and
 * nothing to attach the address to: the list is a place to send a next drop to,
 * not an account.
 *
 * The trim and the lowercase run before the address is checked, so an address
 * pasted with a stray space around it is normalized rather than refused, and
 * `Name@Example.com` and `name@example.com` are the same subscriber. Zod checks
 * the value it is given before applying `.trim()` at the end of a chain, which
 * is why this is a `pipe` and not `.email().trim()`.
 */
export const StoreSubscribeNewsletterSchema = z.object({
  email: z
    .string({ error: "Enter an email address like name@example.com." })
    .trim()
    .toLowerCase()
    .pipe(
      z.email({ error: "Enter an email address like name@example.com." })
    ),
})

export type StoreSubscribeNewsletterBody = z.infer<
  typeof StoreSubscribeNewsletterSchema
>
