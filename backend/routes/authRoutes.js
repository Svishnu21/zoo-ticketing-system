import express from 'express'
import { changePassword, login, logout, me } from '../controllers/authController.js'
import { requireAuth } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/login', login)
router.post('/logout', logout)
router.get('/me', requireAuth, me)
router.post('/me/password', requireAuth, changePassword)

export default router
