import express from 'express'
import { validateQr } from '../controllers/qrController.js'
import { validate, scannerValidateRules } from '../middleware/requestValidation.js'

const router = express.Router()

router.post('/validate', validate(scannerValidateRules), validateQr)

export default router
