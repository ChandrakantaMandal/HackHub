import nodemailer from "nodemailer"
import { env } from "@workspace/config"
import { logger } from "@workspace/logger"
import { otpMail } from "@workspace/utils"

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.GMAIL_USER,
    pass: env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 10000,
  socketTimeout: 10000,
})

export async function sendOtpEmail(email: string, otp: string) {
  try {
    const template = otpMail(otp)
    await transporter.sendMail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    })
    logger.info({ event: "OTP_SENT" })
  } catch (error) {
    logger.error({
      event: "OTP_SEND_FAILED",
      error: {
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
    })
    throw error
  }
}
