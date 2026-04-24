import express from 'express'
import { validateQr, validateTicketId } from '../controllers/qrController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'
import { validate, scannerValidateRules, scannerValidateTicketIdRules } from '../middleware/requestValidation.js'

const router = express.Router()

router.use(requireAuth, requireRole('ADMIN', 'SCANNER'))

router.post('/validate', validate(scannerValidateRules), validateQr)
router.post('/validate-ticket-id', validate(scannerValidateTicketIdRules), validateTicketId)

export default router
