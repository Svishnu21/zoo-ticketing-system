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

export const asyncHandler = (handler) => {
  // Fail fast if a function expecting `next` is wrapped — enforce
  // the rule that final handlers must accept only (req, res).
  if (typeof handler === 'function' && handler.length >= 3) {
    throw new Error(
      'asyncHandler must wrap final handlers that accept (req, res). Use express middleware (req,res,next) directly when you need next().',
    )
  }

  return async (req, res, next) => {
    try {
      // Final route handlers should only accept (req, res) and must not
      // call `next()` themselves. Any thrown error is forwarded here.
      await handler(req, res)
    } catch (error) {
      // Forward errors to the express error handler middleware
      next(error)
    }
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
