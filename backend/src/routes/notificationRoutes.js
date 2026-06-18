import { Router } from 'express'
import { getMyNotifications, markAsRead, markAllAsRead, getUnreadCount } from '../controllers/notificationController.js'
import { authenticate } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/', getMyNotifications)
router.get('/unread-count', getUnreadCount)
router.put('/read-all', markAllAsRead)
router.put('/:id/read', markAsRead)

export default router
