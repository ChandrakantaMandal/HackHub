import { baseLayout, MailTemplate } from "./base"

export const otpMail = (otp: string): MailTemplate => {
  const content = `
    <p>Your OTP:</p>
    <h1 style="letter-spacing:4px;text-align:center;">${otp}</h1>
    <p>Expires in 5 minutes.</p>
  `

  return {
    subject: "Your OTP Code",
    html: baseLayout(content),
    text: `Your OTP is ${otp}`,
  }
}
