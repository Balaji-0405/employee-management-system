import { Router } from 'express'
import {
  getStats,
  getMyTickets,
  createTicket,
  getTicketById,
  updateTicketStatus,
  addComment,
} from '../controllers/helpdeskController.js'
import { authenticate, requireRole } from '../middleware/auth.js'

const router = Router()

router.use(authenticate)

// Specific paths before parameterised /:id routes
router.get('/stats',                   getStats)
router.get('/tickets',                 getMyTickets)
router.post('/tickets',                createTicket)
router.get('/tickets/:id',             getTicketById)
router.put('/tickets/:id',             requireRole('manager', 'admin'), updateTicketStatus)
router.post('/tickets/:id/comments',   addComment)

export default router
