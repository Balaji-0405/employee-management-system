import { Router } from 'express'
import { register, login, getMe, changePassword } from '../controllers/authController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.get('/me', authenticate, getMe)
router.put('/change-password', authenticate, changePassword)

export default router
