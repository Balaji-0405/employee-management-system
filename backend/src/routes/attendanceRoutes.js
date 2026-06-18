import { Router } from 'express'
import {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getToday,
  getHistory,
  getTeamAttendance,
  getMonthly,
  getWeeklyStats,
  getRequests,
  createRequest,
  reviewRequest,
} from '../controllers/attendanceController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.post('/clock-in',              clockIn)
router.post('/clock-out',             clockOut)
router.post('/break-start',           startBreak)
router.post('/break-end',             endBreak)
router.get('/today',                  getToday)
router.get('/history',                getHistory)
router.get('/monthly',                getMonthly)
router.get('/weekly-stats',           getWeeklyStats)
router.get('/requests',               requireRole('manager', 'admin', 'employee'), getRequests)
router.post('/requests',              createRequest)
router.put('/requests/:id/review',    requireRole('manager', 'admin'), reviewRequest)
router.get('/team',                   requireRole('manager', 'admin'), getTeamAttendance)

export default router
