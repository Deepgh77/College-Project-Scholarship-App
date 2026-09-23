const path = require('path');

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];
const MIN_FILE_SIZE = 1024; // 1 KB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const VALID_DOCUMENT_TYPES = [
  'INCOME_CERT',
  'CASTE_CERT',
  'DOMICILE_CERT',
  'MARKSHEET_PREV',
  'FEE_RECEIPT',
  'RATION_CARD',
  'DISABILITY_CERT',
  'OTHER',
];

const DOCUMENT_TYPE_LABELS = {
  INCOME_CERT: {
    label: 'Income Certificate',
    description: 'Issued by competent revenue authority (Tahsildar / Sub-Divisional Officer).',
    mandatoryFor: ['EBC', 'OBC', 'SC', 'ST'],
  },
  CASTE_CERT: {
    label: 'Caste Certificate',
    description: 'Issued by competent authority for SC / ST / VJNT / OBC / SBC categories.',
    mandatoryFor: ['SC', 'ST', 'OBC', 'VJNT', 'SBC'],
  },
  DOMICILE_CERT: {
    label: 'Maharashtra Domicile Certificate',
    description: 'Proof of permanent residence in the State of Maharashtra.',
    mandatoryFor: ['ALL'],
  },
  MARKSHEET_PREV: {
    label: 'Previous Examination Marksheet',
    description: 'Marksheet of previous qualifying exam (SSC, HSC, or last semester).',
    mandatoryFor: ['ALL'],
  },
  FEE_RECEIPT: {
    label: 'College Fee Receipt',
    description: 'Current academic year college fee payment receipt.',
    mandatoryFor: ['ALL'],
  },
  RATION_CARD: {
    label: 'Ration Card',
    description: 'Ration card displaying applicant and family members headcount.',
    mandatoryFor: ['FAMILY_VERIFICATION'],
  },
  DISABILITY_CERT: {
    label: 'Disability / Divyang Certificate',
    description: 'UDID card or Civil Surgeon certificate indicating >= 40% disability.',
    mandatoryFor: ['DIVYANG'],
  },
  OTHER: {
    label: 'Other Supporting Document',
    description: 'Affidavits, gap certificates, or death certificate of parent if applicable.',
    mandatoryFor: ['OPTIONAL'],
  },
};

/**
 * Inspects buffer header bytes to ensure content matches claimed format.
 * Prevents malicious extension spoofing (e.g., .exe renamed to .pdf).
 * @param {Buffer} buffer
 * @returns {string|null} Detected MIME type or null if unrecognized
 */
function detectMagicBytesMime(buffer) {
  if (!buffer || buffer.length < 4) return null;

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'application/pdf';
  }

  // JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  return null;
}

/**
 * Validates uploaded file metadata and binary magic bytes.
 * @param {Object} file - Multer file object
 * @param {string} documentType - Requested DocumentType enum
 * @returns {{ isValid: boolean, error?: string, sanitizedFilename?: string, detectedMime?: string }}
 */
function validateUploadedFile(file, documentType) {
  // 1. Validate Document Type
  if (!documentType || !VALID_DOCUMENT_TYPES.includes(documentType)) {
    return {
      isValid: false,
      error: `Invalid document type. Allowed types: ${VALID_DOCUMENT_TYPES.join(', ')}`,
    };
  }

  // 2. Validate File Existence
  if (!file) {
    return {
      isValid: false,
      error: 'No file uploaded. Please select a document to upload.',
    };
  }

  // 3. Validate File Size
  if (file.size === undefined || file.size < MIN_FILE_SIZE) {
    return {
      isValid: false,
      error: 'Uploaded file is empty or corrupt (minimum file size is 1 KB).',
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: 'File size exceeds the 5 MB limit. Please upload a smaller file.',
    };
  }

  // 4. Validate Extension
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      error: 'Invalid file format. Only PDF, JPG, and PNG files are allowed.',
    };
  }

  // 5. Validate Declared MIME
  const clientMime = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(clientMime)) {
    return {
      isValid: false,
      error: 'Invalid file MIME type. Only PDF and image documents are accepted.',
    };
  }

  // 6. Inspect Magic Bytes (File Buffer)
  if (file.buffer) {
    const detectedMime = detectMagicBytesMime(file.buffer);
    if (!detectedMime) {
      return {
        isValid: false,
        error: 'File signature verification failed. The file appears corrupt or disguised.',
      };
    }

    // Verify consistency between detected format and extension
    if (detectedMime === 'application/pdf' && ext !== '.pdf') {
      return {
        isValid: false,
        error: 'File content does not match the file extension (.pdf expected).',
      };
    }

    if (
      (detectedMime === 'image/jpeg' || detectedMime === 'image/png') &&
      ext !== '.jpg' &&
      ext !== '.jpeg' &&
      ext !== '.png'
    ) {
      return {
        isValid: false,
        error: 'Image content does not match the file extension.',
      };
    }
  }

  // 7. Sanitize Filename to eliminate path traversal & risky chars
  const baseName = path.basename(file.originalname || 'document');
  const sanitizedFilename = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');

  return {
    isValid: true,
    sanitizedFilename,
    detectedMime: clientMime,
  };
}

module.exports = {
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MIN_FILE_SIZE,
  MAX_FILE_SIZE,
  VALID_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  detectMagicBytesMime,
  validateUploadedFile,
};
