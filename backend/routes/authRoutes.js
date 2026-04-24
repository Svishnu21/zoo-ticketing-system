import express from 'express'
import { changePassword, login, logout, me } from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'
import { validate, authLoginRules, changePasswordRules } from '../middleware/requestValidation.js'

const router = express.Router()

router.post('/login', validate(authLoginRules), login)
router.post('/logout', logout)
router.get('/me', requireAuth, me)
router.post('/me/password', requireAuth, validate(changePasswordRules), changePassword)

export default router
