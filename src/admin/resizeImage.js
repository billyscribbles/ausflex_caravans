// Shrink and re-encode in the browser before upload. A 9MB phone photo becomes
// roughly 300KB, so the shop's connection is not waiting on the full file and
// the site's performance budget survives staff uploads.
const MAX_EDGE = 2000
const QUALITY = 0.82

export function fitWithin(width, height, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

export async function resizeImage(file) {
  if (!file.type.startsWith('image/')) {
    throw new Error('That file is not an image.')
  }

  const bitmap = await createImageBitmap(file)
  const { width, height } = fitWithin(bitmap.width, bitmap.height)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  let blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY))
  // Safari below 14 and some older Android browsers cannot encode WebP.
  if (!blob) {
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY))
  }
  if (!blob) throw new Error('Could not process that image.')

  const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
  return new File([blob], `photo.${ext}`, { type: blob.type })
}
