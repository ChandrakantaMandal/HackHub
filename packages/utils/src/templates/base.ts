export const baseLayout = (content: string) => `
  <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #020617; padding: 40px 20px; color: #f8fafc; min-height: 100%;">
    <div style="max-width: 600px; margin: auto; background-color: rgba(15, 23, 42, 0.75); border: 1px solid rgba(51, 65, 85, 0.8); padding: 40px 32px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
      
      <!-- Brand Header -->
      <div style="text-align: center; margin-bottom: 32px;">
        <span style="font-size: 22px; font-weight: 800; letter-spacing: -0.025em; background: linear-gradient(135deg, #c084fc 0%, #60a5fa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">HackHub</span>
      </div>

      <!-- Main Content -->
      ${content}

      <!-- Footer Divider -->
      <div style="margin: 32px 0 24px 0; border-top: 1px solid rgba(51, 65, 85, 0.5);"></div>

      <!-- Footer Info -->
      <p style="font-size: 12px; color: #64748b; text-align: center; margin: 0;">
        &copy; ${new Date().getFullYear()} HackHub. All rights reserved.
      </p>
    </div>
  </div>
`

export type MailTemplate = {
  subject: string
  html: string
  text: string
}
