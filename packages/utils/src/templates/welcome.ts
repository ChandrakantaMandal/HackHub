import { baseLayout, MailTemplate } from "./base"

export const welcomeMail = (username: string): MailTemplate => {
  const content = `
    <h3>Welcome ${username} 🎉</h3>
    <p>Your account is ready.</p>
  `

  return {
    subject: "Welcome!",
    html: baseLayout(content),
    text: `Welcome ${username}`,
  }
}
