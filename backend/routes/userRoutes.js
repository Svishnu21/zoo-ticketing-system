import express from 'express'
import {
  createUser,
  getUserById,
  listUsers,
  resetPassword,
  setUserStatus,
  deleteUser,
  updateUser,
} from '../controllers/userController.js'
import { requireAuth, requireRole } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(requireAuth, requireRole('ADMIN'))

router.get('/', listUsers)
router.post('/', createUser)
router.get('/:id', getUserById)
router.patch('/:id', updateUser)
router.post('/:id/status', setUserStatus)
router.post('/:id/reset-password', resetPassword)
router.delete('/:id', deleteUser)

export default router
