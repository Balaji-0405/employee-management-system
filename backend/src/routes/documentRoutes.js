import { Router } from 'express'
import {
  getMyDocuments,
  uploadDocument,
  downloadDocument,
  deleteDocument,
  shareDocument,
  createFolder,
  getStats,
} from '../controllers/documentController.js'
import { authenticate } from '../middleware/auth.js'
import { uploadSingleFile } from '../middleware/upload.js'

const router = Router()

router.use(authenticate)

// Specific paths must come before parameterised /:id routes
router.get('/stats',          getStats)
router.get('/',               getMyDocuments)
router.post('/upload',        uploadSingleFile, uploadDocument)
router.post('/folders',       createFolder)
router.get('/:id/download',   downloadDocument)
router.delete('/:id',         deleteDocument)
router.put('/:id/share',      shareDocument)

export default router
