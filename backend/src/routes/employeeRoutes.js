import { Router } from 'express'
import { getMe, updateMyProfile, uploadPhoto, getEmployees, getEmployee, updateEmployee } from '../controllers/employeeController.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { uploadSinglePhoto } from '../middleware/upload.js'

const router = Router()

router.use(authenticate)

// Self-service routes — must come before /:id to avoid route conflict
router.get('/me', getMe)
router.put('/me', updateMyProfile)
router.post('/me/photo', uploadSinglePhoto, uploadPhoto)

// Manager / admin routes
router.get('/', requireRole('admin', 'manager'), getEmployees)
router.get('/:id', requireRole('admin', 'manager'), getEmployee)
router.put('/:id', requireRole('admin'), updateEmployee)

export default router
