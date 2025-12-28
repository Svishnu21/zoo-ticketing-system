import express from 'express'
import { validateQr, validateTicketId } from '../controllers/qrController.js'

const router = express.Router()

router.post('/validate', validateQr)
router.post('/validate-ticket-id', validateTicketId)

export default router
