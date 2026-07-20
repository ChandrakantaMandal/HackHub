import redis from "./client"

export async function setCache(key: string, value: any, expire: number) {
  await redis.set(key, JSON.stringify(value), "EX", expire)
}

export async function getCache<T>(key: string): Promise<T | null> {
  const data = await redis.get(key)

  if (!data) {
    return null
  }

  return JSON.parse(data)
}

export async function deleteCache(key: string) {
  await redis.del(key)
}
