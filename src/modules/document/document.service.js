const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const documentRepository = require('./document.repository');
const {
  validateUploadedFile,
  VALID_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
} = require('./file-validation.service');

// Private local storage root for document vault
const STORAGE_ROOT = path.resolve(__dirname, '../../../storage/documents');

class DocumentService {
  constructor() {
    this._ensureStorageDirectory();
  }

  /**
   * Initializes private storage root.
   */
  async _ensureStorageDirectory() {
    try {
      await fs.promises.mkdir(STORAGE_ROOT, { recursive: true });
    } catch (err) {
      console.error('[DocumentService] Failed to create storage directory:', err);
    }
  }

  /**
   * Resolves StudentProfile ID from authenticated User ID.
   */
  async _resolveStudentProfile(userId) {
    const profile = await documentRepository.findStudentProfileByUserId(userId);
    if (!profile) {
      const error = new Error('Student profile not found. Please initialize your profile before managing documents.');
      error.statusCode = 404;
      throw error;
    }
    return profile;
  }

  /**
   * Formats a Document record with clear currentVersion and history details.
   */
  _formatDocumentResponse(doc) {
    const versions = doc.versions || [];
    const currentVersion = versions.length > 0 ? versions[0] : null;

    return {
      id: doc.id,
      studentId: doc.studentId,
      documentType: doc.documentType,
      typeInfo: DOCUMENT_TYPE_LABELS[doc.documentType] || {
        label: doc.documentType,
        description: '',
      },
      status: doc.status,
      currentVersionNumber: currentVersion ? currentVersion.versionNumber : 0,
      currentVersion: currentVersion
        ? {
            id: currentVersion.id,
            versionNumber: currentVersion.versionNumber,
            originalFilename: currentVersion.originalFilename,
            fileSizeBytes: currentVersion.fileSizeBytes,
            fileSizeFormatted: this._formatBytes(currentVersion.fileSizeBytes),
            mimeType: currentVersion.mimeType,
            isCompressed: currentVersion.isCompressed,
            uploadedAt: currentVersion.uploadedAt,
          }
        : null,
      versionCount: versions.length,
      history: versions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        originalFilename: v.originalFilename,
        fileSizeBytes: v.fileSizeBytes,
        fileSizeFormatted: this._formatBytes(v.fileSizeBytes),
        mimeType: v.mimeType,
        isCompressed: v.isCompressed,
        uploadedAt: v.uploadedAt,
      })),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  _formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  /**
   * Retrieves all supported document types and scheme metadata.
   */
  getDocumentTypes() {
    return VALID_DOCUMENT_TYPES.map((type) => ({
      documentType: type,
      ...(DOCUMENT_TYPE_LABELS[type] || { label: type, description: '' }),
    }));
  }

  /**
   * Lists all documents belonging to the authenticated student.
   */
  async getStudentDocuments(userId) {
    const profile = await this._resolveStudentProfile(userId);
    const documents = await documentRepository.findStudentDocuments(profile.id);

    return documents.map((doc) => this._formatDocumentResponse(doc));
  }

  /**
   * Retrieves details for a specific document with full version history.
   */
  async getDocumentById(id, userId) {
    const profile = await this._resolveStudentProfile(userId);
    const doc = await documentRepository.findDocumentByIdAndStudentId(id, profile.id);

    if (!doc) {
      const error = new Error('Document not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    return this._formatDocumentResponse(doc);
  }

  /**
   * Uploads or replaces a document, managing atomic version incrementation.
   */
  async uploadDocument(userId, file, documentType, isCompressed = false) {
    const profile = await this._resolveStudentProfile(userId);

    // 1. Validate file format, magic bytes, and size
    const validation = validateUploadedFile(file, documentType);
    if (!validation.isValid) {
      const error = new Error(validation.error);
      error.statusCode = 400;
      throw error;
    }

    // 2. Check if student already has a Document record for this DocumentType
    const existingDoc = await documentRepository.findDocumentByTypeAndStudentId(
      documentType,
      profile.id
    );

    let versionNumber = 1;
    let isReplacement = false;

    if (existingDoc) {
      isReplacement = true;
      const latestVersion =
        existingDoc.versions && existingDoc.versions.length > 0
          ? existingDoc.versions[0].versionNumber
          : 0;
      versionNumber = latestVersion + 1;
    }

    // 3. Prepare private storage directory: storage/documents/<studentId>/<documentType>/
    const targetDir = path.join(STORAGE_ROOT, profile.id, documentType);
    await fs.promises.mkdir(targetDir, { recursive: true });

    // Generate safe, unique on-disk filename
    const uniqueId = crypto.randomBytes(4).toString('hex');
    const safeDiskName = `v${versionNumber}-${Date.now()}-${uniqueId}-${validation.sanitizedFilename}`;
    const storagePath = path.join(targetDir, safeDiskName);

    // 4. Persist physical file to private disk
    await fs.promises.writeFile(storagePath, file.buffer);

    // 5. Persist database records atomically
    let resultDoc;
    if (!isReplacement) {
      resultDoc = await documentRepository.createDocumentWithVersion({
        studentId: profile.id,
        documentType,
        originalFilename: file.originalname,
        storagePath,
        fileSizeBytes: file.size,
        mimeType: validation.detectedMime,
        isCompressed,
      });
    } else {
      const { document } = await documentRepository.createNewVersionForDocument({
        documentId: existingDoc.id,
        versionNumber,
        originalFilename: file.originalname,
        storagePath,
        fileSizeBytes: file.size,
        mimeType: validation.detectedMime,
        isCompressed,
      });
      resultDoc = document;
    }

    return {
      isReplacement,
      versionNumber,
      document: this._formatDocumentResponse(resultDoc),
    };
  }

  /**
   * Resolves physical file stream info for current document or a specific version.
   */
  async resolveFileStream(userId, documentId, requestedVersionId = null) {
    const profile = await this._resolveStudentProfile(userId);

    const doc = await documentRepository.findDocumentByIdAndStudentId(documentId, profile.id);
    if (!doc) {
      const error = new Error('Document not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    let targetVersion = null;
    if (requestedVersionId) {
      targetVersion = (doc.versions || []).find((v) => v.id === requestedVersionId);
    } else {
      targetVersion = doc.versions && doc.versions.length > 0 ? doc.versions[0] : null;
    }

    if (!targetVersion) {
      const error = new Error('Requested document version not found.');
      error.statusCode = 404;
      throw error;
    }

    // Verify physical file exists on disk
    try {
      await fs.promises.access(targetVersion.storagePath, fs.constants.R_OK);
    } catch {
      const error = new Error('The physical document file could not be located on the server.');
      error.statusCode = 404;
      throw error;
    }

    return {
      filePath: targetVersion.storagePath,
      originalFilename: targetVersion.originalFilename,
      mimeType: targetVersion.mimeType,
      fileSizeBytes: targetVersion.fileSizeBytes,
      versionNumber: targetVersion.versionNumber,
    };
  }

  /**
   * Safely deletes a document and its files, unless referenced by an application snapshot.
   */
  async deleteDocument(documentId, userId) {
    const profile = await this._resolveStudentProfile(userId);

    const doc = await documentRepository.findDocumentByIdAndStudentId(documentId, profile.id);
    if (!doc) {
      const error = new Error('Document not found or access denied.');
      error.statusCode = 404;
      throw error;
    }

    // Check if any version is referenced in an Application snapshot
    const snapshotCount = await documentRepository.countApplicationSnapshotsForDocument(doc.id);
    if (snapshotCount > 0) {
      const error = new Error(
        'This document is part of a submitted scholarship application and cannot be deleted. You may upload a replacement version instead.'
      );
      error.statusCode = 409;
      throw error;
    }

    // 1. Delete DB records
    const deleted = await documentRepository.deleteDocument(doc.id);

    // 2. Clean up physical files from disk asynchronously
    if (deleted.versions) {
      for (const v of deleted.versions) {
        fs.promises.unlink(v.storagePath).catch(() => {});
      }
    }

    return { success: true, message: 'Document deleted successfully.' };
  }
}

module.exports = new DocumentService();
