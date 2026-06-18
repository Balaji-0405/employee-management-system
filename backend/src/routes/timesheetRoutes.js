import { Router } from 'express'
import {
  saveDraft,
  getOrCreateWeeklyTimesheet,
  submitTimesheet,
  reviewTimesheet,
  getMyTimesheets,
  getPendingTimesheets,
  getTeamTimesheets,
  getTimesheetById,
  updateTimesheetEntry,
  deleteTimesheet,
} from '../controllers/timesheetController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// Specific paths must come before parameterised /:id routes
router.get('/weekly', getOrCreateWeeklyTimesheet)
router.get('/my', getMyTimesheets)
router.get('/pending', requireRole('manager', 'admin'), getPendingTimesheets)
router.get('/team', requireRole('manager', 'admin'), getTeamTimesheets)
router.post('/draft', saveDraft)
router.put('/entry/:id', updateTimesheetEntry)
router.post('/:id/submit', submitTimesheet)
router.put('/:id/review', requireRole('manager', 'admin'), reviewTimesheet)
router.get('/:id', getTimesheetById)
router.delete('/:id', deleteTimesheet)

export default router
