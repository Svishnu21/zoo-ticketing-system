import express from 'express'
import { validateQr } from '../controllers/qrController.js'

const router = express.Router()

router.post('/validate', validateQr)

export default router
