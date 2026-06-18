import multer from 'multer'

const storage = multer.memoryStorage()

// ── Photo upload (profile pictures) ────────────────────────────────────────────
const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const PHOTO_MAX_BYTES  = 2 * 1024 * 1024 // 2 MB

const photoUpload = multer({
  storage,
  limits: { fileSize: PHOTO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (PHOTO_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Only JPEG, PNG and WebP images are allowed'), false)
    }
  },
})

export const uploadSinglePhoto = photoUpload.single('photo')

// ── Document upload (any file type) ────────────────────────────────────────────
const DOC_MAX_BYTES = 20 * 1024 * 1024 // 20 MB

const docUpload = multer({
  storage,
  limits: { fileSize: DOC_MAX_BYTES },
  fileFilter: (_req, _file, cb) => cb(null, true),
})

export const uploadSingleFile = docUpload.single('file')
