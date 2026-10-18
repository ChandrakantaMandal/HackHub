import { baseLayout, MailTemplate } from "./base"

export const otpMail = (otp: string): MailTemplate => {
  const content = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; color: #f8fafc;">
      <div style="margin: 0 auto 20px auto; width: 48px; height: 48px; border-radius: 12px; border: 1px solid rgba(168, 85, 247, 0.3); background-color: rgba(147, 51, 234, 0.2); display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 24px;">🚀</span>
      </div>
      <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.025em;">Verify Your Email</h2>
      <p style="margin: 0 0 24px 0; font-size: 14px; color: #94a3b8;">Enter the verification code below to activate your HackHub account.</p>
      
      <div style="margin: 0 auto 24px auto; max-width: 280px; padding: 20px; border-radius: 16px; border: 1px solid rgba(147, 51, 234, 0.4); background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 27, 75, 0.4) 100%); box-shadow: 0 10px 25px -5px rgba(147, 51, 234, 0.15);">
        <span style="font-family: monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #c084fc;">${otp}</span>
      </div>
      
      <p style="margin: 0; font-size: 12px; color: #64748b;">This code expires in <strong style="color: #94a3b8;">5 minutes</strong>. If you didn't request this, you can safely ignore this email.</p>
    </div>
  `

  return {
    subject: "Verify Your HackHub Account",
    html: baseLayout(content),
    text: `Your HackHub verification code is ${otp}. It expires in 5 minutes.`,
  }
}
