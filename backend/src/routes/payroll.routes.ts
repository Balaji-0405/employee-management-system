import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/auth.js';
import * as ctrl from '../controllers/payroll.controller.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', message: 'Payroll router is alive' }));

router.use(authenticate);

// Admin: payroll run lifecycle
router.post('/runs',                requireRole('admin'), ctrl.createPayrollRun);
router.get('/runs',                 requireRole('admin'), ctrl.getPayrollRuns);
router.get('/runs/:id',             requireRole('admin'), ctrl.getPayrollRunById);
router.post('/runs/:id/compute',    requireRole('admin'), ctrl.computePayrollRun);
router.post('/runs/:id/lock',       requireRole('admin'), ctrl.lockPayrollRun);
router.post('/runs/:id/disburse',   requireRole('admin'), ctrl.disbursePayrollRun);
router.get('/runs/:id/register',    requireRole('admin'), ctrl.getPayrollRegister);
router.get('/runs/:id/bank-file',   requireRole('admin'), ctrl.getBankFile);

// Admin: salary config — static segment must come before :employeeId
router.post('/salary-config/seed-from-employees', requireRole('admin'), ctrl.seedSalaryConfigs);
router.get('/salary-config/:employeeId',           requireRole('admin'), ctrl.getSalaryConfig);
router.put('/salary-config/:employeeId',           requireRole('admin'), ctrl.upsertSalaryConfig);

// Admin: one-time items and overrides
router.post('/one-time',              requireRole('admin'), ctrl.addOneTimeItem);
router.put('/payslips/:id/override',  requireRole('admin'), ctrl.overridePayslip);

// Employee: self-service payslips (static segment before dynamic)
router.get('/payslips/my',          ctrl.getMyPayslips);
router.get('/payslips/my/:runId',   ctrl.getMyPayslipDetail);

export default router;
