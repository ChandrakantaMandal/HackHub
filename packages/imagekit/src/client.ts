import ImageKit from "imagekit"
import { env } from "@workspace/config"

let client: ImageKit | null = null

export function isImageKitConfigured(): boolean {
  return Boolean(
    env.IMAGEKIT_PUBLIC_KEY &&
    env.IMAGEKIT_PRIVATE_KEY &&
    env.IMAGEKIT_URL_ENDPOINT
  )
}

export function getImageKit(): ImageKit {
  if (!isImageKitConfigured()) {
    throw new Error(
      "ImageKit is not configured. Set IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY and IMAGEKIT_URL_ENDPOINT in the environment."
    )
  }

  if (!client) {
    client = new ImageKit({
      publicKey: env.IMAGEKIT_PUBLIC_KEY!,
      privateKey: env.IMAGEKIT_PRIVATE_KEY!,
      urlEndpoint: env.IMAGEKIT_URL_ENDPOINT!,
    })
  }

  return client
}
