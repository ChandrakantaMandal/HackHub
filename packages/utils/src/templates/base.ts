export const baseLayout = (content: string) => `
  <div style="font-family: Arial; background:#f5f5f5; padding:20px;">
    <div style="max-width:600px;margin:auto;background:#fff;padding:20px;border-radius:8px;">
      <h2 style="text-align:center;">Your App</h2>
      ${content}
      <hr />
      <p style="font-size:12px;color:gray;text-align:center;">
        © ${new Date().getFullYear()} Your App
      </p>
    </div>
  </div>
`

export type MailTemplate = {
  subject: string
  html: string
  text: string
}
