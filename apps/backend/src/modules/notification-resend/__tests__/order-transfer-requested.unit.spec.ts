import { renderEmail, EMAIL_TEMPLATES } from "../templates"

const base = {
  storeName: "DevCart",
  orderNumber: 7,
  orderId: "order_01H8XYZ",
  recipientEmail: "new@example.com",
  originalEmail: "old@example.com",
  acceptUrl: "https://shop.test/order/order_01H8XYZ/transfer/abc/accept",
  declineUrl: "https://shop.test/order/order_01H8XYZ/transfer/abc/decline",
}

describe("order-transfer-requested email", () => {
  it("names the order and both addresses", () => {
    const content = renderEmail(EMAIL_TEMPLATES.ORDER_TRANSFER_REQUESTED, base)

    expect(content.subject).toContain("#7")
    expect(content.html).toContain("new@example.com")
    expect(content.html).toContain("old@example.com")
    expect(content.text).toContain("new@example.com")
  })

  it("carries the accept link as a button and as text", () => {
    const content = renderEmail(EMAIL_TEMPLATES.ORDER_TRANSFER_REQUESTED, base)

    expect(content.html).toContain(base.acceptUrl)
    expect(content.text).toContain(base.acceptUrl)
    expect(content.text).toContain(base.declineUrl)
  })

  it("is readable without a decline link", () => {
    const content = renderEmail(EMAIL_TEMPLATES.ORDER_TRANSFER_REQUESTED, {
      ...base,
      declineUrl: undefined,
    })

    expect(content.html).not.toContain("decline")
    expect(content.text).not.toContain("Decline")
    expect(content.text).toContain(base.acceptUrl)
  })

  it("omits the origin address when it is the recipient's own", () => {
    const content = renderEmail(EMAIL_TEMPLATES.ORDER_TRANSFER_REQUESTED, {
      ...base,
      originalEmail: undefined,
    })

    expect(content.text).not.toContain("old@example.com")
  })
})
