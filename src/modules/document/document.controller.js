const path = require('path');
const documentService = require('./document.service');

class DocumentController {
  /**
   * GET /api/documents/types
   * Returns supported DocumentTypes with human-friendly descriptions.
   */
  async getDocumentTypes(req, res, next) {
    try {
      const types = documentService.getDocumentTypes();
      res.json({
        success: true,
        types,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents
   * Lists all documents belonging to the authenticated student.
   */
  async listMyDocuments(req, res, next) {
    try {
      const documents = await documentService.getStudentDocuments(req.user.id);
      res.json({
        success: true,
        count: documents.length,
        documents,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id
   * Retrieves full document metadata including all version history.
   */
  async getDocumentById(req, res, next) {
    try {
      const document = await documentService.getDocumentById(req.params.id, req.user.id);
      res.json({
        success: true,
        document,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/documents/upload
   * Handles multipart upload for new documents and replacement versions.
   */
  async uploadDocument(req, res, next) {
    try {
      const { documentType, isCompressed } = req.body;
      const file = req.file;

      const isCompressedBool = isCompressed === 'true' || isCompressed === true;
      const result = await documentService.uploadDocument(
        req.user.id,
        file,
        documentType,
        isCompressedBool
      );

      res.status(result.isReplacement ? 200 : 201).json({
        success: true,
        message: result.isReplacement
          ? `Document updated successfully (Version ${result.versionNumber}).`
          : 'Document uploaded successfully.',
        isReplacement: result.isReplacement,
        versionNumber: result.versionNumber,
        document: result.document,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/preview
   * Streams the current version inline for browser viewing.
   */
  async previewCurrentDocument(req, res, next) {
    try {
      const fileInfo = await documentService.resolveFileStream(req.user.id, req.params.id);

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(fileInfo.originalFilename)}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      res.sendFile(path.resolve(fileInfo.filePath));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/download
   * Streams the current version as a file download attachment.
   */
  async downloadCurrentDocument(req, res, next) {
    try {
      const fileInfo = await documentService.resolveFileStream(req.user.id, req.params.id);

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileInfo.originalFilename)}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      res.sendFile(path.resolve(fileInfo.filePath));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/versions/:versionId/download
   * Streams a specific historical version as a download attachment.
   */
  async downloadDocumentVersion(req, res, next) {
    try {
      const fileInfo = await documentService.resolveFileStream(
        req.user.id,
        req.params.id,
        req.params.versionId
      );

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(fileInfo.originalFilename)}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      res.sendFile(path.resolve(fileInfo.filePath));
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/documents/:id/versions/:versionId/preview
   * Streams a specific version inline for browser viewing.
   */
  async previewDocumentVersion(req, res, next) {
    try {
      const fileInfo = await documentService.resolveFileStream(
        req.user.id,
        req.params.id,
        req.params.versionId
      );

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(fileInfo.originalFilename)}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

      res.sendFile(path.resolve(fileInfo.filePath));
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/documents/:id
   * Deletes an unreferenced document and its physical files.
   */
  async deleteDocument(req, res, next) {
    try {
      const result = await documentService.deleteDocument(req.params.id, req.user.id);
      res.json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DocumentController();
