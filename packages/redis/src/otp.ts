import redis from "./client"

export async function saveOTP(key: string, otp: string, expiresIn = 300) {
  await redis.set(`otp:${key}`, otp, "EX", expiresIn)
}

export async function getOTP(key: string) {
  return await redis.get(`otp:${key}`)
}

export async function verifyOTP(key: string, otp: string) {
  const storedOTP = await redis.get(`otp:${key}`)

  if (!storedOTP) {
    return false
  }

  if (storedOTP !== otp) {
    return false
  }

  await redis.del(`otp:${key}`)

  return true
}

export async function deleteOTP(key: string) {
  await redis.del(`otp:${key}`)
}
