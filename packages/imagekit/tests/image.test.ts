import { describe, expect, it } from "vitest"
import { decodeBase64Image } from "../src/image"

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const GIF = Buffer.from("GIF89a......", "latin1")
const WEBP = Buffer.concat([
  Buffer.from("RIFF", "latin1"),
  Buffer.from([0x24, 0x00, 0x00, 0x00]),
  Buffer.from("WEBPVP8 ", "latin1"),
])

const asDataUrl = (b: Buffer, mime = "application/octet-stream") =>
  `data:${mime};base64,${b.toString("base64")}`

describe("decodeBase64Image", () => {
  it("decodes a JPEG regardless of the declared MIME type", () => {
    const result = decodeBase64Image(asDataUrl(JPEG, "image/jpeg"))
    expect(result?.mimeType).toBe("image/jpeg")
    expect(result?.ext).toBe("jpg")
    expect(result?.buffer.equals(JPEG)).toBe(true)
  })

  it("decodes a PNG", () => {
    expect(decodeBase64Image(asDataUrl(PNG))?.mimeType).toBe("image/png")
  })

  it("decodes a GIF", () => {
    expect(decodeBase64Image(asDataUrl(GIF))?.mimeType).toBe("image/gif")
  })

  it("decodes a WebP", () => {
    expect(decodeBase64Image(asDataUrl(WEBP))?.mimeType).toBe("image/webp")
  })

  it("rejects a mislabeled file (declared png, actual jpeg)", () => {
    const result = decodeBase64Image(asDataUrl(JPEG, "image/png"))
    // Signature wins over the declared type: this IS a jpeg.
    expect(result?.mimeType).toBe("image/jpeg")
  })

  it("rejects non-image payloads", () => {
    const svg = Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")
    expect(decodeBase64Image(asDataUrl(svg, "image/svg+xml"))).toBeNull()
  })

  it("rejects input that is not a base64 data URL", () => {
    expect(decodeBase64Image("https://ik.imagekit.io/x/avatar.png")).toBeNull()
    expect(decodeBase64Image("")).toBeNull()
    expect(decodeBase64Image("data:image/png;base64,")).toBeNull()
  })

  it("rejects empty buffers", () => {
    expect(decodeBase64Image(asDataUrl(Buffer.alloc(0)))).toBeNull()
  })
})
