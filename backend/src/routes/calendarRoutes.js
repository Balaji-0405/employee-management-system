import { Router } from 'express'
import {
  getEvents, createEvent, deleteEvent,
  getHolidays, createHoliday, deleteHoliday,
  approveHoliday, bulkApproveHolidays,
} from '../controllers/calendarController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/events',        getEvents)
router.post('/events',       createEvent)
router.delete('/events/:id', deleteEvent)

router.get('/holidays',                          getHolidays)
router.post('/holidays',         requireRole('admin'), createHoliday)
router.post('/holidays/bulk-approve', requireRole('admin'), bulkApproveHolidays)
router.patch('/holidays/:id/approve', requireRole('admin'), approveHoliday)
router.delete('/holidays/:id',   requireRole('admin'), deleteHoliday)

export default router
