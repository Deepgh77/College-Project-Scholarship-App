const { prisma } = require('../../config/prisma');

class DocumentRepository {
  /**
   * Resolves StudentProfile record for a given User ID.
   */
  async findStudentProfileByUserId(userId) {
    return prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        fullName: true,
        category: true,
        isHandicapped: true,
      },
    });
  }

  /**
   * Retrieves all documents belonging to a student, including all versions ordered newest first.
   */
  async findStudentDocuments(studentId) {
    return prisma.document.findMany({
      where: { studentId },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Finds a document by its ID and studentId (enforces IDOR protection).
   */
  async findDocumentByIdAndStudentId(id, studentId) {
    return prisma.document.findFirst({
      where: {
        id,
        studentId,
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
  }

  /**
   * Finds a specific document for a student by DocumentType.
   */
  async findDocumentByTypeAndStudentId(documentType, studentId) {
    return prisma.document.findUnique({
      where: {
        studentId_documentType: {
          studentId,
          documentType,
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
        },
      },
    });
  }

  /**
   * Finds a specific DocumentVersion by its versionId and validates student ownership.
   */
  async findDocumentVersionById(versionId, studentId) {
    return prisma.documentVersion.findFirst({
      where: {
        id: versionId,
        document: {
          studentId,
        },
      },
      include: {
        document: true,
      },
    });
  }

  /**
   * Checks if any version of a document is referenced in an ApplicationDocumentSnapshot.
   */
  async countApplicationSnapshotsForDocument(documentId) {
    return prisma.applicationDocumentSnapshot.count({
      where: {
        documentVersion: {
          documentId,
        },
      },
    });
  }

  /**
   * Creates a new Document and its initial Version 1 atomically.
   */
  async createDocumentWithVersion({
    studentId,
    documentType,
    originalFilename,
    storagePath,
    fileSizeBytes,
    mimeType,
    isCompressed = false,
  }) {
    return prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          studentId,
          documentType,
          status: 'AVAILABLE',
          versions: {
            create: {
              versionNumber: 1,
              originalFilename,
              storagePath,
              fileSizeBytes,
              mimeType,
              isCompressed: Boolean(isCompressed),
            },
          },
        },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
          },
        },
      });

      return document;
    });
  }

  /**
   * Appends a new DocumentVersion to an existing Document atomically.
   */
  async createNewVersionForDocument({
    documentId,
    versionNumber,
    originalFilename,
    storagePath,
    fileSizeBytes,
    mimeType,
    isCompressed = false,
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Create the new version
      const newVersion = await tx.documentVersion.create({
        data: {
          documentId,
          versionNumber,
          originalFilename,
          storagePath,
          fileSizeBytes,
          mimeType,
          isCompressed: Boolean(isCompressed),
        },
      });

      // 2. Update Document timestamp and status to AVAILABLE
      const updatedDocument = await tx.document.update({
        where: { id: documentId },
        data: {
          status: 'AVAILABLE',
          updatedAt: new Date(),
        },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
          },
        },
      });

      return { document: updatedDocument, version: newVersion };
    });
  }

  /**
   * Deletes a document and cascades to its versions.
   */
  async deleteDocument(id) {
    return prisma.document.delete({
      where: { id },
      include: {
        versions: true,
      },
    });
  }
}

module.exports = new DocumentRepository();
