import cron from 'node-cron';
import { monthlyELAccrual, yearEndProcessing } from './leaveAccrual.js';

// 1st of every month at 00:01 AM
cron.schedule('1 0 1 * *', async () => {
  console.log('[Cron] Running monthly EL accrual...');
  await monthlyELAccrual();
  console.log('[Cron] Monthly EL accrual complete.');
});

// December 31 at 11:59 PM
cron.schedule('59 23 31 12 *', async () => {
  console.log('[Cron] Running year-end leave processing...');
  await yearEndProcessing();
  console.log('[Cron] Year-end processing complete.');
});

export function initCronJobs(): void {
  console.log('[Cron] Payroll cron jobs registered.');
}
