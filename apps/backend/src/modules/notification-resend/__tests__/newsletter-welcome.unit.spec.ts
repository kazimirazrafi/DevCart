import { EMAIL_TEMPLATES, renderEmail } from "../templates"

describe("newsletter welcome email", () => {
  it("confirms the address and offers a way out of the list", () => {
    const content = renderEmail(EMAIL_TEMPLATES.NEWSLETTER_WELCOME, {
      storeName: "DevCart",
      email: "name@example.com",
      catalogueUrl: "http://localhost:8000/store",
      supportEmail: "support@example.com",
    })

    expect(content.subject).toBe("You're on the DevCart drop list")
    expect(content.html).toContain("name@example.com")
    expect(content.html).toContain("http://localhost:8000/store")
    expect(content.html).toContain("support@example.com")
    expect(content.text).toContain("name@example.com")
    expect(content.text).toContain("http://localhost:8000/store")
  })

  it("falls back to the store's support address when none is passed", () => {
    const content = renderEmail(EMAIL_TEMPLATES.NEWSLETTER_WELCOME, {
      catalogueUrl: "http://localhost:8000/store",
    })

    expect(content.subject).toBe("You're on the DevCart drop list")
    expect(content.html).toContain("support@kazimirazrafi.dev")
  })

  it("escapes an address that tries to inject markup", () => {
    const content = renderEmail(EMAIL_TEMPLATES.NEWSLETTER_WELCOME, {
      email: "<script>alert(1)</script>@example.com",
      catalogueUrl: "http://localhost:8000/store",
    })

    expect(content.html).not.toContain("<script>")
    expect(content.html).toContain("&lt;script&gt;")
  })
})
