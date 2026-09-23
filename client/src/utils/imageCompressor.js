/**
 * Browser-Native Image Compressor for Student Document Vault (Phase 4.1)
 * 
 * Key Principles:
 * 1. Zero external dependencies (uses standard Canvas & ImageBitmap APIs).
 * 2. Memory-safety: Canvas is NEVER allocated at huge source dimensions; target dimensions
 *    are computed first and capped at 2400px (or 1800px on pass 2).
 * 3. Legibility: Preserves high resolution and 84% quality for official scholarship
 *    document text, seals, stamps, and signatures.
 * 4. PNG Handling: Converted to JPEG with an opaque white background to avoid black transparency
 *    artifacts and achieve high compression.
 * 5. Safe Resource Cleanup: Explicitly closes ImageBitmap and revokes object URLs.
 */

export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB
const EXTREME_DIMENSION_LIMIT = 16000; // Hard memory safety cap (px)

/**
 * Calculates target dimensions preserving aspect ratio with a long-edge constraint.
 */
function calculateTargetDimensions(srcWidth, srcHeight, maxLongEdge) {
  if (srcWidth <= maxLongEdge && srcHeight <= maxLongEdge) {
    return { targetWidth: srcWidth, targetHeight: srcHeight };
  }

  if (srcWidth >= srcHeight) {
    const targetWidth = maxLongEdge;
    const targetHeight = Math.max(1, Math.round((srcHeight * maxLongEdge) / srcWidth));
    return { targetWidth, targetHeight };
  } else {
    const targetHeight = maxLongEdge;
    const targetWidth = Math.max(1, Math.round((srcWidth * maxLongEdge) / srcHeight));
    return { targetWidth, targetHeight };
  }
}

/**
 * Safely probes image dimensions using an HTML Image element or ImageBitmap.
 */
function probeImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to decode image file. The file may be corrupt or an unsupported format.'));
    };

    img.src = objectUrl;
  });
}

/**
 * Performs a single compression pass onto a memory-bounded canvas.
 */
async function executeCompressionPass(file, srcWidth, srcHeight, maxLongEdge, quality) {
  const { targetWidth, targetHeight } = calculateTargetDimensions(srcWidth, srcHeight, maxLongEdge);

  // 1. Decode bitmap with bounded resize options if supported by browser
  let bitmap = null;
  try {
    bitmap = await createImageBitmap(file, {
      resizeWidth: targetWidth,
      resizeHeight: targetHeight,
      resizeQuality: 'high',
    });
  } catch {
    // Fallback if resize options aren't supported
    bitmap = await createImageBitmap(file);
  }

  // 2. Allocate canvas strictly at target dimensions (NEVER source dimensions)
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    if (bitmap && typeof bitmap.close === 'function') bitmap.close();
    throw new Error('Unable to initialize canvas rendering context.');
  }

  // 3. Draw solid white background (crucial for PNGs or transparent scans)
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // 4. Render scaled image
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  // 5. Free GPU/bitmap memory immediately
  if (bitmap && typeof bitmap.close === 'function') {
    bitmap.close();
  }

  // 6. Export to JPEG Blob
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to generate compressed image blob from canvas.'));
      },
      'image/jpeg',
      quality
    );
  });

  // Clean canvas memory
  canvas.width = 0;
  canvas.height = 0;

  return { blob, targetWidth, targetHeight };
}

/**
 * Compresses an oversized image (JPEG or PNG) for safe document vault upload.
 * 
 * @param {File} file - The original uncompressed file from input.
 * @returns {Promise<Object>} Compression summary and File instance.
 */
export async function compressDocumentImage(file) {
  if (!file) {
    throw new Error('No file provided for compression.');
  }

  if (file.type === 'application/pdf') {
    throw new Error('PDF compression is not supported to avoid damaging digital signatures or text layers.');
  }

  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new Error('Unsupported image format. Only JPEG and PNG files can be compressed.');
  }

  // 1. Probe source dimensions safely
  const { width: srcWidth, height: srcHeight } = await probeImageDimensions(file);

  // Memory safety upper bound check
  if (srcWidth > EXTREME_DIMENSION_LIMIT || srcHeight > EXTREME_DIMENSION_LIMIT) {
    throw new Error(
      `Image dimensions (${srcWidth}×${srcHeight}px) exceed safe processing limits. Please crop or resize the document before uploading.`
    );
  }

  // 2. Pass 1: Max 2400px long edge, 0.84 quality (preserves fine text, seals, and stamps)
  let pass1 = await executeCompressionPass(file, srcWidth, srcHeight, 2400, 0.84);
  let finalBlob = pass1.blob;
  let usedPass = 1;

  // 3. Pass 2 Auto-retry if still > 5 MB
  if (finalBlob.size > MAX_UPLOAD_BYTES) {
    try {
      const pass2 = await executeCompressionPass(file, srcWidth, srcHeight, 1800, 0.75);
      finalBlob = pass2.blob;
      usedPass = 2;
    } catch (err) {
      console.warn('[imageCompressor] Pass 2 compression failed, retaining pass 1 result:', err);
    }
  }

  const isOverLimit = finalBlob.size > MAX_UPLOAD_BYTES;

  // 4. Construct safe new File object with .jpg extension and image/jpeg MIME
  const baseName = file.name.replace(/\.[^/.]+$/, '');
  const compressedFileName = `${baseName}.jpg`;
  const compressedFile = new File([finalBlob], compressedFileName, {
    type: 'image/jpeg',
    lastModified: Date.now(),
  });

  const savedBytes = Math.max(0, file.size - finalBlob.size);
  const reductionPercent = Math.round((savedBytes / file.size) * 100);

  return {
    success: !isOverLimit,
    file: compressedFile,
    blob: finalBlob,
    originalName: file.name,
    compressedName: compressedFileName,
    originalSize: file.size,
    originalSizeFormatted: formatBytes(file.size),
    compressedSize: finalBlob.size,
    compressedSizeFormatted: formatBytes(finalBlob.size),
    savedPercent: reductionPercent,
    isOverLimit,
    usedPass,
  };
}
