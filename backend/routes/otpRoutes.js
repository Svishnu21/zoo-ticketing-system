// OTP routes — public endpoints for visitor booking OTP flow
import express from 'express'
import { sendOtp, verifyOtp, resendOtp, otpHealth } from '../controllers/otpController.js'

const router = express.Router()

router.post('/send', sendOtp)
router.post('/verify', verifyOtp)
router.post('/resend', resendOtp)
router.get('/health', otpHealth)

export default router
