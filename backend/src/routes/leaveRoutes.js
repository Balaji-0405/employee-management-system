import { Router } from 'express'
import {
  getLeaveBalance,
  checkBalance,
  getEmployeeBalanceById,
  applyLeave,
  reviewLeave,
  getMyLeaveRequests,
  getPendingLeaveRequests,
  getTeamLeaves,
  accrueMonthlyLeave,
  carryForwardLeaves
} from '../controllers/leaveController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.get('/balance', getLeaveBalance)
router.get('/balance/check', checkBalance)
router.get('/balance/:employeeId', requireRole('manager', 'admin'), getEmployeeBalanceById)
router.get('/my', getMyLeaveRequests)
router.get('/pending', requireRole('manager', 'admin'), getPendingLeaveRequests)
router.get('/team', requireRole('manager', 'admin'), getTeamLeaves)
router.post('/apply', applyLeave)
router.post('/accrue', requireRole('admin'), accrueMonthlyLeave)
router.post('/carry-forward', requireRole('admin'), carryForwardLeaves)
router.put('/:id/review', requireRole('manager', 'admin'), reviewLeave)

export default router
