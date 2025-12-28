export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message)
    this.statusCode = statusCode
    this.details = details
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details)
  }

  static unauthorized(message, details) {
    return new ApiError(401, message, details)
  }

  static forbidden(message, details) {
    return new ApiError(403, message, details)
  }

  static notFound(message, details) {
    return new ApiError(404, message, details)
  }

  static conflict(message, details) {
    return new ApiError(409, message, details)
  }

  static internal(message = 'Unexpected error occurred.', details) {
    return new ApiError(500, message, details)
  }
}

export const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next)
  } catch (error) {
    next(error)
  }
}

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = Number.isInteger(error?.statusCode) ? error.statusCode : 500
  const isServerError = statusCode >= 500

  // Log server-side errors without leaking stack traces to clients
  if (isServerError) {
    console.error('[ERROR]', error)
  }

  const payload = {
    success: false,
    message: error?.message || 'Something went wrong.',
  }

  if (error?.details) {
    payload.details = error.details
  }

  res.status(statusCode).json(payload)
}
