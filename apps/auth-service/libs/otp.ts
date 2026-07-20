import { redis } from "@workspace/redis"
import crypto from "crypto"
import { logger } from "@workspace/logger"

function hashOTP(otp: string) {
  return crypto.createHash("sha256").update(otp).digest("hex")
}

export function generateOTP() {
  return crypto.randomInt(100000, 1000000).toString()
}

export async function saveOTP(key: string, otp: string, expiresIn = 300) {
  const otpKey = `otp:${key}`
  const attemptsKey = `otp:attempts:${key}`

  await redis.set(otpKey, hashOTP(otp), "EX", expiresIn)

  await redis.del(attemptsKey)

  logger.info("OTP saved")
}

export async function getOTP(key: string) {
  return await redis.get(`otp:${key}`)
}

export async function verifyOTP(key: string, otp: string) {
  const otpKey = `otp:${key}`
  const attemptsKey = `otp:attempts:${key}`

  const storedOTP = await redis.get(otpKey)

  if (!storedOTP) {
    logger.info("OTP saved", {
      event: "OTP_SAVED",
    })
    return false
  }

  const attempts = await redis.incr(attemptsKey)

  if (attempts === 1) {
    await redis.expire(attemptsKey, 300)
  }

  if (attempts > 5) {
    await redis.del(otpKey)
    await redis.del(attemptsKey)
    return false
  }

  const hashedInput = hashOTP(otp)

  try {
    const inputBuf = Buffer.from(hashedInput, "hex")
    const storedBuf = Buffer.from(storedOTP, "hex")

    if (inputBuf.length !== storedBuf.length) {
      logger.error("OTP buffer length mismatch", {
        inputLength: inputBuf.length,
        storedLength: storedBuf.length,
      })
      return false
    }

    const isMatch = crypto.timingSafeEqual(inputBuf, storedBuf)

    if (!isMatch) {
      logger.warn("OTP mismatch")
      return false
    }
  } catch (error) {
    logger.error("OTP comparison error")
    return false
  }

  await redis.del(otpKey)
  await redis.del(attemptsKey)

  return true
}

export async function deleteOTP(key: string) {
  const otpKey = `otp:${key}`
  const attemptsKey = `otp:attempts:${key}`

  await redis.del(otpKey)
  await redis.del(attemptsKey)
}
