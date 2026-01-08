import express from 'express'
import bookingsRouter from './bookings.controller.js'
import scannerLogsRouter from './scanner.controller.js'

const router = express.Router()

router.use(bookingsRouter)
router.use(scannerLogsRouter)

export default router
