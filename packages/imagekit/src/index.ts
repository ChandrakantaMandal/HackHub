import { getImageKit } from "./client"

export { getImageKit, isImageKitConfigured } from "./client"
export {
  decodeBase64Image,
  SUPPORTED_IMAGE_MIME_TYPES,
  type DecodedImage,
} from "./image"

/** Default folder (path) inside the ImageKit media library. */
export const DEFAULT_UPLOAD_FOLDER = "/hackhub"

export interface ImageKitUploadOptions {
  /** Raw base64 string or a Buffer with the file contents. */
  file: string | Buffer
  fileName: string
  /** ImageKit folder/path. Defaults to {@link DEFAULT_UPLOAD_FOLDER}. */
  folder?: string
  tags?: string[]
}

export interface ImageKitUploadResult {
  url: string
  fileId: string
  name: string
  size: number
  height: number
  width: number
}

export async function uploadImage(
  options: ImageKitUploadOptions
): Promise<ImageKitUploadResult> {
  const result = await getImageKit().upload({
    file: options.file,
    fileName: options.fileName,
    folder: options.folder ?? DEFAULT_UPLOAD_FOLDER,
    useUniqueFileName: true,
    tags: options.tags,
  })

  return {
    url: result.url,
    fileId: result.fileId,
    name: result.name,
    size: result.size,
    height: result.height,
    width: result.width,
  }
}

export async function deleteImage(fileId: string): Promise<void> {
  await getImageKit().deleteFile(fileId)
}
