import QRCode from 'qrcode'
import { ApiError } from './errors.js'

// Generate a QR image that encodes only the secure qrToken.
// Suitable for on-screen display, printing, or embedding in PDFs.
// The token should already be a random, opaque value; never include ticket details here.
export const generateQrDataUrl = async (qrToken, { size = 256, errorCorrection = 'M', margin = 1 } = {}) => {
  if (!qrToken) {
    throw ApiError.badRequest('QR token is required to generate a QR image.')
  }

  try {
    return await QRCode.toDataURL(qrToken, {
      errorCorrection,
      width: size,
      margin,
      scale: 4,
    })
  } catch (error) {
    throw ApiError.internal('Failed to generate QR image.', { cause: error.message })
  }
}

// Alternative helper for binary output (e.g., PDFs or attachments)
export const generateQrPngBuffer = async (qrToken, { size = 256, errorCorrection = 'M', margin = 1 } = {}) => {
  if (!qrToken) {
    throw ApiError.badRequest('QR token is required to generate a QR image.')
  }

  try {
    return await QRCode.toBuffer(qrToken, {
      type: 'png',
      errorCorrection,
      width: size,
      margin,
      scale: 4,
    })
  } catch (error) {
    throw ApiError.internal('Failed to generate QR image.', { cause: error.message })
  }
}
