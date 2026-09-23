const { Router } = require('express');
const multer = require('multer');
const documentController = require('./document.controller');
const { requireAuth, requireRole } = require('../auth/auth.middleware');

// Configure multer with in-memory buffering to allow magic-byte inspection before writing to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB maximum
    files: 1, // Single file upload per request
  },
});

const router = Router();

// All document vault routes require an authenticated STUDENT account
router.use(requireAuth, requireRole('STUDENT'));

// Static/parameterless endpoints (MUST be registered before /:id)
router.get('/types', (req, res, next) => documentController.getDocumentTypes(req, res, next));
router.post(
  '/upload',
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const error = new Error(
            'File size exceeds the 5 MB limit. Please select a smaller file or compress it before uploading.'
          );
          error.statusCode = 400;
          return next(error);
        }
        err.statusCode = 400;
        return next(err);
      }
      next();
    });
  },
  (req, res, next) => documentController.uploadDocument(req, res, next)
);

// Preview and Download endpoints
router.get('/:id/preview', (req, res, next) =>
  documentController.previewCurrentDocument(req, res, next)
);
router.get('/:id/download', (req, res, next) =>
  documentController.downloadCurrentDocument(req, res, next)
);
router.get('/:id/versions/:versionId/download', (req, res, next) =>
  documentController.downloadDocumentVersion(req, res, next)
);
router.get('/:id/versions/:versionId/preview', (req, res, next) =>
  documentController.previewDocumentVersion(req, res, next)
);

// Parameterized document lookup & deletion
router.get('/:id', (req, res, next) => documentController.getDocumentById(req, res, next));
router.delete('/:id', (req, res, next) => documentController.deleteDocument(req, res, next));

// List all documents
router.get('/', (req, res, next) => documentController.listMyDocuments(req, res, next));

module.exports = router;
