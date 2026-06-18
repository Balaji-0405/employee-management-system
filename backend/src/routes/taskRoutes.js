import { Router } from 'express'
import {
  createTask, getMyTasks, getMyTasksGrouped,
  getUpcomingDeadlines, updateTaskStatus,
  getTeamTasks, getTeamTasksGrouped, getAllTasksAdmin,
  getTaskDetail, updateTask, deleteTask,
  addTaskComment, logTaskTime,
  getSubTasks, getProjectTasks
} from '../controllers/taskController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// Specific paths before parameterised ones
router.get('/my',           getMyTasks)
router.get('/grouped',      getMyTasksGrouped)
router.get('/deadlines',    getUpcomingDeadlines)
router.get('/team',         requireRole('manager', 'admin'), getTeamTasks)
router.get('/team/grouped', requireRole('manager', 'admin'), getTeamTasksGrouped)
router.get('/all',                requireRole('admin'), getAllTasksAdmin)
router.get('/project/:projectId', getProjectTasks)
router.get('/:id',                getTaskDetail)
router.get('/:taskId/subtasks',   getSubTasks)

router.post('/',             createTask)
router.put('/:id',           updateTask)
router.put('/:id/status',    updateTaskStatus)
router.delete('/:id',        requireRole('admin', 'manager'), deleteTask)
router.post('/:id/comments', addTaskComment)
router.post('/:id/time-logs', logTaskTime)

export default router
