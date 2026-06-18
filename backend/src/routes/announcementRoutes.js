import { Router } from 'express'
import { getAll, create, update, remove } from '../controllers/announcementController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getAll)
router.post('/', requireRole('manager', 'admin'), create)
router.put('/:id', requireRole('manager', 'admin'), update)
router.delete('/:id', requireRole('manager', 'admin'), remove)

export default router
