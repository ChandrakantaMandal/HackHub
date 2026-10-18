import { baseLayout, MailTemplate } from "./base"

export const welcomeMail = (username: string): MailTemplate => {
  const content = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; color: #f8fafc;">
      <div style="margin: 0 auto 20px auto; width: 48px; height: 48px; border-radius: 12px; border: 1px solid rgba(168, 85, 247, 0.3); background-color: rgba(147, 51, 234, 0.2); display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 24px;">🎉</span>
      </div>
      <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.025em;">Welcome, ${username}!</h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8;">Your HackHub account is all set up and ready to go. We're thrilled to have you on board!</p>
      
      <div style="margin: 32px 0;">
        <a href="${process.env.WEB_URL || "http://localhost:3000"}/dashboard" target="_blank" style="display: inline-block; padding: 14px 28px; border-radius: 12px; background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%); color: #ffffff; font-size: 14px; font-weight: 600; text-decoration: none; box-shadow: 0 10px 25px -5px rgba(147, 51, 234, 0.4);">
          Go to Dashboard
        </a>
      </div>

      <p style="margin: 24px 0 0 0; font-size: 12px; color: #64748b;">
        Start building amazing projects with HackHub today.
      </p>
    </div>
  `

  return {
    subject: "Welcome to HackHub!",
    html: baseLayout(content),
    text: `Welcome to HackHub, ${username}! Your account is ready.`,
  }
}
