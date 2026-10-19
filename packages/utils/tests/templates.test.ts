import { describe, it, expect, afterEach } from "vitest"
import { baseLayout, type MailTemplate } from "../src/templates/base"
import { otpMail } from "../src/templates/otp"
import { welcomeMail } from "../src/templates/welcome"
import { resetPasswordMail } from "../src/templates/reset-password"

const originalWebUrl = process.env.WEB_URL

afterEach(() => {
  if (originalWebUrl === undefined) delete process.env.WEB_URL
  else process.env.WEB_URL = originalWebUrl
})

const expectMailShape = (mail: MailTemplate) => {
  expect(typeof mail.subject).toBe("string")
  expect(typeof mail.html).toBe("string")
  expect(typeof mail.text).toBe("string")
}

describe("baseLayout", () => {
  it("wraps content in the HackHub branded layout", () => {
    const html = baseLayout("<p>Hello content</p>")
    expect(html).toContain("<p>Hello content</p>")
    expect(html).toContain("HackHub")
    expect(html).toContain(String(new Date().getFullYear()))
  })
})

describe("otpMail", () => {
  it("returns a well-formed mail", () => {
    expectMailShape(otpMail("123456"))
  })

  it("uses the expected subject", () => {
    expect(otpMail("123456").subject).toBe("Verify Your HackHub Account")
  })

  it("includes the OTP in html and text", () => {
    const mail = otpMail("654321")
    expect(mail.html).toContain("654321")
    expect(mail.text).toContain("654321")
    expect(mail.text).toContain("5 minutes")
  })

  it("renders html through baseLayout", () => {
    expect(otpMail("123456").html).toContain("HackHub")
  })
})

describe("welcomeMail", () => {
  it("returns a well-formed mail", () => {
    expectMailShape(welcomeMail("Alice"))
  })

  it("uses the expected subject and greets the user", () => {
    const mail = welcomeMail("Alice")
    expect(mail.subject).toBe("Welcome to HackHub!")
    expect(mail.html).toContain("Welcome, Alice!")
    expect(mail.text).toContain("Alice")
  })

  it("links to the dashboard using WEB_URL", () => {
    process.env.WEB_URL = "https://hackhub.test"
    expect(welcomeMail("Alice").html).toContain(
      "https://hackhub.test/dashboard"
    )
  })

  it("falls back to localhost:3000 when WEB_URL is unset", () => {
    delete process.env.WEB_URL
    expect(welcomeMail("Alice").html).toContain(
      "http://localhost:3000/dashboard"
    )
  })
})

describe("resetPasswordMail", () => {
  const link = "https://hackhub.test/reset?token=abc123"

  it("returns a well-formed mail", () => {
    expectMailShape(resetPasswordMail(link))
  })

  it("uses the expected subject", () => {
    expect(resetPasswordMail(link).subject).toBe("Reset Your HackHub Password")
  })

  it("includes the reset link in html and text", () => {
    const mail = resetPasswordMail(link)
    expect(mail.html).toContain(link)
    expect(mail.text).toContain(link)
  })

  it("mentions the 1 hour expiry", () => {
    expect(resetPasswordMail(link).html).toContain("expires in 1 hour")
  })
})
