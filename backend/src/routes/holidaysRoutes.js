import { Router } from 'express'
import { getHolidays, seedHolidays } from '../controllers/holidaysController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// Specific path before root to avoid any future conflicts
router.post('/seed', requireRole('admin'), seedHolidays)
router.get('/',      getHolidays)

export default router
