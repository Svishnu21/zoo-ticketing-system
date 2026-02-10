import express from 'express'
import { validateQr, validateTicketId } from '../controllers/qrController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth, requireRole('ADMIN', 'SCANNER'))

router.post('/validate', validateQr)
router.post('/validate-ticket-id', validateTicketId)

export default router
