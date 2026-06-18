import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/leave.controller.js';

const router = Router();
router.use(authenticate);

// Employee: self-service
router.get('/balance/my',      ctrl.getMyLeaveBalance);
router.post('/requests',       ctrl.applyLeave);
router.get('/requests/my',     ctrl.getMyLeaveRequests);

// Manager: team balance and approvals
// Static segments (/my, /team, /pending) must appear before dynamic (/:employeeId, /:id/*)
router.get('/balance/team',    requireRole('manager', 'admin'), ctrl.getTeamLeaveBalances);
router.get('/balance/:employeeId', requireRole('admin', 'manager'), ctrl.getEmployeeLeaveBalance);
router.get('/requests/pending',    requireRole('manager', 'admin'), ctrl.getPendingLeaveApprovals);
router.get('/requests/team-history', requireRole('manager', 'admin'), ctrl.getTeamLeaveHistory);
router.put('/requests/:id/approve', requireRole('manager', 'admin'), ctrl.approveLeave);
router.put('/requests/:id/reject',  requireRole('manager', 'admin'), ctrl.rejectLeave);
router.delete('/requests/:id', ctrl.cancelLeaveRequest);

// Admin: full leave ledger
router.get('/transactions/:employeeId', requireRole('admin'), ctrl.getLeaveTransactions);

export default router;
