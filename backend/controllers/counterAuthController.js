import { asyncHandler, ApiError } from '../utils/errors.js'

// Minimal counter login handler. This currently accepts any non-empty
// username/password and returns 200. Replace with real auth later.
export const postCounterLogin = asyncHandler(async (req, res) => {
  const { username, password } = req.body || {}
  if (!username || !password) throw ApiError.badRequest('username and password required')

  // For now, accept any credentials and respond with a success payload.
  // If you have an admin user list, validate here and return 401 on failure.
  res.json({ success: true, user: { username } })
})
