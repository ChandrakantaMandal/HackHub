const SIGNATURES: Array<{
  mimeType: string
  ext: string
  matches: (bytes: Buffer) => boolean
}> = [
  {
    mimeType: "image/jpeg",
    ext: "jpg",
    matches: (b) =>
      b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mimeType: "image/png",
    ext: "png",
    matches: (b) =>
      b.length >= 8 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47,
  },
  {
    mimeType: "image/gif",
    ext: "gif",
    matches: (b) =>
      b.length >= 4 &&
      b[0] === 0x47 &&
      b[1] === 0x49 &&
      b[2] === 0x46 &&
      b[3] === 0x38,
  },
  {
    mimeType: "image/webp",
    ext: "webp",
    matches: (b) =>
      b.length >= 12 &&
      b.subarray(0, 4).toString("latin1") === "RIFF" &&
      b.subarray(8, 12).toString("latin1") === "WEBP",
  },
]

/** MIME types accepted by the image upload helpers. */
export const SUPPORTED_IMAGE_MIME_TYPES = SIGNATURES.map((s) => s.mimeType)

export interface DecodedImage {
  buffer: Buffer
  /** Sniffed from the file signature — never the declared type. */
  mimeType: string
  ext: string
}

const DATA_URL_PATTERN =
  /^data:([a-zA-Z0-9!#$&^_.+-]+\/[a-zA-Z0-9!#$&^_.+-]+);base64,([\s\S]+)$/

export function decodeBase64Image(dataUrl: string): DecodedImage | null {
  const match = DATA_URL_PATTERN.exec(dataUrl)
  if (!match) return null

  const buffer = Buffer.from(match[2], "base64")
  if (buffer.length === 0) return null

  const signature = SIGNATURES.find((s) => s.matches(buffer))
  if (!signature) return null

  return {
    buffer,
    mimeType: signature.mimeType,
    ext: signature.ext,
  }
}
