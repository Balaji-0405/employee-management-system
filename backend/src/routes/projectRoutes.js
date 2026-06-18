import { Router } from 'express'
import {
  createProject, createProjectAdmin, getProjects,
  getAllProjectsAdmin, getMyProjects, getProjectStats,
  getProjectDetail, updateProject, deleteProject,
  addProjectMember, removeProjectMember,
  updateProjectProgress
} from '../controllers/projectController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// Specific paths before parameterised ones
router.get('/my',    getMyProjects)
router.get('/stats', getProjectStats)
router.get('/all',   requireRole('admin'), getAllProjectsAdmin)
router.get('/',      getProjects)
router.get('/:id',   getProjectDetail)

router.post('/',         requireRole('admin'), createProjectAdmin)
router.post('/manager',  requireRole('admin', 'manager'), createProject)
router.put('/:id',       requireRole('admin', 'manager'), updateProject)
router.delete('/:id',    requireRole('admin'), deleteProject)

router.post('/:id/members',               requireRole('admin', 'manager'), addProjectMember)
router.delete('/:id/members/:memberId',   requireRole('admin', 'manager'), removeProjectMember)
router.post('/:id/progress',              requireRole('admin', 'manager'), updateProjectProgress)

export default router
