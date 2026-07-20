import { baseLayout, MailTemplate } from "./base"

export const resetPasswordMail = (link: string): MailTemplate => {
  const content = `
    <p>Reset your password:</p>
    <a href="${link}" style="padding:10px 15px;background:black;color:white;border-radius:5px;">
      Reset Password
    </a>
  `

  return {
    subject: "Reset Password",
    html: baseLayout(content),
    text: link,
  }
}
