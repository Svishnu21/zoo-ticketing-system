import express from 'express'
import bookingsRouter from './bookings.controller.js'
import scannerLogsRouter from './scanner.controller.js'
import analyticsRouter from './analytics.controller.js'
import reportsRouter from './reports.controller.js'
import { requireAuth, requireRole } from '../backend/middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth, requireRole('ADMIN'))

router.use(bookingsRouter)
router.use(scannerLogsRouter)
router.use(analyticsRouter)
router.use(reportsRouter)

// Tariff administration is disabled; respond with 403 for legacy endpoints
router.all(
	[
		'/tariffs',
		/^\/tariffs(\/.*)?$/,
		'/tariff-management',
		/^\/tariff-management(\/.*)?$/,
		'/update-tariff',
		'/create-tariff',
		'/delete-tariff',
	],
	(_req, res) => res.status(403).json({ success: false, message: 'Tariff administration is disabled.' }),
)

export default router
