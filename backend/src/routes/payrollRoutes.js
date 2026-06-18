import { Router } from 'express'
import { processMonthlyPayroll, getMyPayslips, getPayslipDetail, getAllPayroll } from '../controllers/payrollController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

router.post('/process', requireRole('admin'), processMonthlyPayroll)
router.get('/my', getMyPayslips)
router.get('/all', requireRole('admin', 'manager'), getAllPayroll)
router.get('/:id', getPayslipDetail)

export default router
