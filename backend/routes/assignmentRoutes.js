import express from 'express'
import { listCounters, listGates } from '../controllers/assignmentController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

// Apply auth middleware on a per-route basis to avoid accidentally
// enforcing authentication for all `/api/*` requests when this router
// is mounted at `/api` in the main app.
router.get('/counters', requireAuth, requireRole('ADMIN'), listCounters)
router.get('/gates', requireAuth, requireRole('ADMIN'), listGates)

export default router
