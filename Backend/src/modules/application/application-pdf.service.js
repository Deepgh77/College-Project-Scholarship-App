const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// Private local storage for submitted application PDFs
const APP_STORAGE_ROOT = path.resolve(__dirname, '../../../storage/applications');

/**
 * Formats byte size into human readable string.
 */
function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Ensures private storage directory exists.
 */
async function ensureApplicationStorageDir() {
  try {
    await fs.promises.mkdir(APP_STORAGE_ROOT, { recursive: true });
  } catch (err) {
    console.error('[ApplicationPdfService] Storage directory error:', err);
  }
}

// Initialize directory
ensureApplicationStorageDir();

/**
 * Gets path to cached submitted application PDF.
 */
function getApplicationPdfPath(applicationId, cycleNumber = null) {
  if (cycleNumber && cycleNumber > 1) {
    return path.join(APP_STORAGE_ROOT, `${applicationId}-cycle-${cycleNumber}.pdf`);
  }
  return path.join(APP_STORAGE_ROOT, `${applicationId}.pdf`);
}

/**
 * Checks if a submitted application PDF already exists on disk.
 */
async function hasSubmittedPdf(applicationId, cycleNumber = null) {
  try {
    const filePath = getApplicationPdfPath(applicationId, cycleNumber);
    await fs.promises.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates an application PDF buffer using pdfkit.
 */
function generateApplicationPdfBuffer(data) {
  return new Promise((resolve, reject) => {
    try {
      const {
        applicationNumber = 'DRAFT-PREVIEW',
        status = 'DRAFT',
        submittedAt = null,
        student = {},
        scholarship = {},
        questionnaireResponses = {},
        questionnaireSchema = [],
        documentsChecklist = [],
        isDraftPreview = false,
      } = data;

      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        bufferPages: true,
        info: {
          Title: `Scholarship Application - ${applicationNumber}`,
          Author: 'Scholarship Management System',
          Subject: 'Student Scholarship Application Form',
          CreationDate: new Date(),
        },
      });

      const chunks = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const primaryColor = '#1e3a8a'; // Deep Indigo/Navy
      const secondaryColor = '#3b82f6'; // Bright Blue
      const darkText = '#0f172a'; // Slate 900
      const mutedText = '#475569'; // Slate 600
      const borderColor = '#cbd5e1'; // Slate 300
      const lightBg = '#f8fafc'; // Slate 50

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 80;
      const startX = 40;

      // Helper: Section Header
      function drawSectionHeader(title, iconText = '') {
        if (doc.y > 680) {
          doc.addPage();
        }
        doc.moveDown(0.6);
        const y = doc.y;
        doc
          .rect(startX, y, contentWidth, 22)
          .fill(lightBg)
          .stroke(borderColor);

        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(primaryColor)
          .text(`${iconText ? iconText + ' ' : ''}${title.toUpperCase()}`, startX + 8, y + 6);

        doc.y = y + 26;
      }

      // Helper: 2-Column or 4-Column Key-Value Grid
      function drawGridRow(items, bgAlt = false) {
        if (doc.y > 720) {
          doc.addPage();
        }
        const colWidth = contentWidth / items.length;
        const y = doc.y;
        const rowHeight = 24;

        if (bgAlt) {
          doc
            .rect(startX, y, contentWidth, rowHeight)
            .fill('#f1f5f9');
        }

        doc
          .rect(startX, y, contentWidth, rowHeight)
          .stroke(borderColor);

        items.forEach((item, idx) => {
          const itemX = startX + idx * colWidth + 6;
          doc
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor(mutedText)
            .text(item.label.toUpperCase(), itemX, y + 3, { width: colWidth - 12 });

          doc
            .font('Helvetica')
            .fontSize(8.5)
            .fillColor(darkText)
            .text(String(item.value || 'N/A'), itemX, y + 12, {
              width: colWidth - 12,
              lineBreak: false,
              ellipsis: true,
            });
        });

        doc.y = y + rowHeight;
      }

      // --- HEADER BLOCK ---
      doc
        .rect(startX, 35, contentWidth, 54)
        .fill(primaryColor);

      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor('#ffffff')
        .text('SCHOLARSHIP APPLICATION SUMMARY', startX + 12, 45, { align: 'center' });

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor('#e2e8f0')
        .text('End-to-End Scholarship Management System • Academic Project Demonstration Record', startX + 12, 63, {
          align: 'center',
        });

      doc.y = 96;

      // --- TOP REFERENCE / ARN BOX ---
      const metaY = doc.y;
      doc
        .rect(startX, metaY, contentWidth, 42)
        .fill(isDraftPreview ? '#fffbeb' : '#f0fdf4')
        .stroke(isDraftPreview ? '#fde68a' : '#bbf7d0');

      // Left: ARN
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(isDraftPreview ? '#b45309' : '#15803d')
        .text(isDraftPreview ? 'PRE-SUBMISSION DRAFT PREVIEW' : 'OFFICIAL APPLICATION REFERENCE NUMBER (ARN)', startX + 12, metaY + 7);

      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .fillColor(isDraftPreview ? '#b45309' : primaryColor)
        .text(applicationNumber, startX + 12, metaY + 20);

      // Right: Status & Submission Date
      const rightX = startX + contentWidth - 180;
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(mutedText)
        .text('STATUS:', rightX, metaY + 7, { continued: true })
        .font('Helvetica-Bold')
        .fillColor(status === 'SUBMITTED' ? '#16a34a' : '#d97706')
        .text(` ${status}`);

      const dateStr = submittedAt
        ? new Date(submittedAt).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Not Yet Formally Submitted';

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor(mutedText)
        .text(`Date: ${dateStr}`, rightX, metaY + 22);

      doc.y = metaY + 48;

      // --- 1. SCHOLARSHIP SCHEME DETAILS ---
      drawSectionHeader('1. Scholarship Scheme & Benefit Details');
      drawGridRow([
        { label: 'Scheme Code', value: scholarship.code },
        { label: 'Academic Year', value: scholarship.academicYear || '2024-2025' },
        { label: 'Sanction Benefit Amount', value: scholarship.benefitAmount ? `Rs. ${Number(scholarship.benefitAmount).toLocaleString('en-IN')}` : 'N/A' },
      ]);
      drawGridRow([
        { label: 'Scheme Name', value: scholarship.name },
        { label: 'Nodal Department', value: scholarship.department?.name || scholarship.departmentName || 'Government Department' },
      ]);

      // --- 2. APPLICANT PERSONAL DETAILS ---
      drawSectionHeader('2. Applicant Personal & Demographic Information');
      const personal = student.personal || student;
      drawGridRow([
        { label: 'Full Legal Name', value: personal.fullName || student.fullName },
        { label: 'Caste Category', value: personal.category || student.category },
        { label: 'Date of Birth', value: personal.dob ? new Date(personal.dob).toLocaleDateString('en-IN') : 'N/A' },
        { label: 'Gender', value: personal.gender || student.gender },
      ]);
      drawGridRow([
        { label: 'Mobile Number', value: personal.mobile || student.mobile || 'N/A' },
        { label: 'Disability Status', value: personal.isHandicapped ? `Yes (${personal.disabilityPercentage || 0}%)` : 'No' },
        { label: 'Religion', value: personal.religion || 'Not Specified' },
        { label: 'Nationality', value: 'Indian' },
      ]);

      // Address
      const address = student.address || student;
      drawGridRow([
        { label: 'Residential Address', value: address.address || 'N/A' },
        { label: 'City / Taluka', value: `${address.cityVillage || ''} ${address.taluka ? `(${address.taluka})` : ''}`.trim() || 'N/A' },
        { label: 'District & State', value: `${address.district || 'Pune'}, ${address.state || 'Maharashtra'}` },
        { label: 'Pincode', value: address.pincode || 'N/A' },
      ]);

      // --- 3. ACADEMIC & INSTITUTIONAL ENROLLMENT ---
      drawSectionHeader('3. Academic & College Enrollment Details');
      const academic = student.academic || student;
      drawGridRow([
        { label: 'Enrolled College', value: academic.collegeName || student.collegeName || 'N/A' },
        { label: 'Affiliated University', value: academic.collegeUniversity || 'State Board / University' },
      ]);
      drawGridRow([
        { label: 'Course Name', value: academic.courseName || student.courseName || 'N/A' },
        { label: 'Course Year', value: academic.courseYear ? `Year ${academic.courseYear}` : 'N/A' },
        { label: 'Admission Year', value: academic.admissionYear || 'N/A' },
        { label: 'Prev Exam %', value: academic.previousPercentage ? `${academic.previousPercentage}% (${academic.previousQualification || ''})` : 'N/A' },
      ]);

      // --- 4. FINANCIAL & DISBURSEMENT BANK DETAILS ---
      drawSectionHeader('4. Household Income & Direct Benefit Bank Details');
      const financial = student.financial || student;
      const bank = student.bank || student;
      const rawIncome = financial.annualFamilyIncome || student.annualFamilyIncome;
      drawGridRow([
        { label: 'Annual Household Income', value: rawIncome ? `Rs. ${Number(rawIncome).toLocaleString('en-IN')}` : 'N/A' },
        { label: 'Guardian / Father Name', value: financial.guardianName || 'N/A' },
      ]);
      drawGridRow([
        { label: 'Bank Name', value: bank.bankName || 'Not Specified' },
        { label: 'Bank Account Number', value: bank.bankAccountNo ? `XXXXXX${String(bank.bankAccountNo).slice(-4)}` : 'N/A' },
        { label: 'IFSC Code', value: bank.bankIfsc || 'N/A' },
      ]);

      // --- 5. SCHEME QUESTIONNAIRE RESPONSES ---
      drawSectionHeader('5. Scheme-Specific Questionnaire Responses');
      const qFields = questionnaireSchema.length > 0
        ? questionnaireSchema
        : Object.keys(questionnaireResponses).map((k) => ({ fieldKey: k, label: k }));

      if (qFields.length > 0) {
        for (let i = 0; i < qFields.length; i += 2) {
          const row = [];
          row.push({
            label: qFields[i].label || qFields[i].fieldKey,
            value: questionnaireResponses[qFields[i].fieldKey] !== undefined
              ? String(questionnaireResponses[qFields[i].fieldKey])
              : 'N/A',
          });
          if (i + 1 < qFields.length) {
            row.push({
              label: qFields[i + 1].label || qFields[i + 1].fieldKey,
              value: questionnaireResponses[qFields[i + 1].fieldKey] !== undefined
                ? String(questionnaireResponses[qFields[i + 1].fieldKey])
                : 'N/A',
            });
          }
          drawGridRow(row, i % 4 === 0);
        }
      } else {
        drawGridRow([{ label: 'Questionnaire Status', value: 'No scheme-specific questionnaires required for this scheme.' }]);
      }

      // --- 6. ATTACHED DOCUMENTS VERIFICATION CHECKLIST ---
      drawSectionHeader('6. Attached Documents Checklist (Vault Verified)');
      if (doc.y > 670) doc.addPage();

      // Table Header
      const docHeaderY = doc.y;
      doc
        .rect(startX, docHeaderY, contentWidth, 18)
        .fill('#e2e8f0');

      doc
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor(darkText)
        .text('DOCUMENT TYPE', startX + 6, docHeaderY + 5, { width: 140 })
        .text('ATTACHED FILE NAME', startX + 150, docHeaderY + 5, { width: 180 })
        .text('VERSION', startX + 335, docHeaderY + 5, { width: 45 })
        .text('SIZE', startX + 385, docHeaderY + 5, { width: 55 })
        .text('STATUS', startX + 445, docHeaderY + 5, { width: 80 });

      doc.y = docHeaderY + 18;

      if (documentsChecklist.length > 0) {
        documentsChecklist.forEach((d, idx) => {
          if (doc.y > 730) doc.addPage();
          const rowY = doc.y;
          const isAttached = d.status === 'ATTACHED' || d.versionNumber || d.documentVersionId;
          const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';

          doc
            .rect(startX, rowY, contentWidth, 20)
            .fill(bg)
            .stroke(borderColor);

          const docLabel = d.helpTitle || d.documentType || 'Document';
          const fileName = d.originalFilename || (d.attachedVersion && d.attachedVersion.originalFilename) || (isAttached ? 'Uploaded Document' : 'Not Attached');
          const version = d.versionNumber || (d.attachedVersion && d.attachedVersion.versionNumber) ? `v${d.versionNumber || d.attachedVersion.versionNumber}` : '-';
          const size = d.fileSizeBytes || (d.attachedVersion && d.attachedVersion.fileSizeBytes) ? formatBytes(d.fileSizeBytes || d.attachedVersion.fileSizeBytes) : '-';
          const tag = d.isMandatory ? 'Mandatory' : 'Optional';
          const statusText = isAttached ? `Attached (${tag})` : (d.isMandatory ? 'Missing' : 'Not Attached');

          doc
            .font('Helvetica-Bold')
            .fontSize(7.5)
            .fillColor(darkText)
            .text(docLabel, startX + 6, rowY + 5, { width: 140, ellipsis: true })
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor(mutedText)
            .text(fileName, startX + 150, rowY + 5, { width: 180, ellipsis: true })
            .text(version, startX + 335, rowY + 5, { width: 45 })
            .text(size, startX + 385, rowY + 5, { width: 55 })
            .font('Helvetica-Bold')
            .fillColor(isAttached ? '#16a34a' : (d.isMandatory ? '#dc2626' : '#64748b'))
            .text(statusText, startX + 445, rowY + 5, { width: 80 });

          doc.y = rowY + 20;
        });
      } else {
        const rowY = doc.y;
        doc
          .rect(startX, rowY, contentWidth, 20)
          .fill('#ffffff')
          .stroke(borderColor);
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(mutedText)
          .text('No documents configured or required.', startX + 8, rowY + 5);
        doc.y = rowY + 20;
      }

      // --- 7. STATUTORY LEGAL DECLARATION ---
      drawSectionHeader('7. Statutory Legal Declaration & Verification Undertaking');
      if (doc.y > 690) doc.addPage();

      const declY = doc.y;
      doc
        .rect(startX, declY, contentWidth, 68)
        .fill('#fefce8')
        .stroke('#fef08a');

      doc
        .font('Helvetica')
        .fontSize(7.5)
        .fillColor('#854d0e')
        .text(
          'STATUTORY APPLICANT UNDERTAKING: I hereby solemnly declare that all information furnished in this application is true, complete, and authentic. I satisfy all eligibility rules prescribed for this scheme. I am not receiving any duplicate maintenance allowance or concurrent government scholarship for this course. I acknowledge that if any document or declaration is found fraudulent, my application will be cancelled and the scholarship disbursed will be recovered with statutory legal action.',
          startX + 8,
          declY + 6,
          { width: contentWidth - 16, lineGap: 1.5 }
        );

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#1e3a8a')
        .text(
          `Digitally Accepted & Submitted by: ${personal.fullName || student.fullName || 'Student'} • Recorded via System Auth Session`,
          startX + 8,
          declY + 52
        );

      doc.y = declY + 74;

      // --- FOOTER ACROSS ALL PAGES ---
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

        // Footer dividing line
        doc
          .strokeColor(borderColor)
          .lineWidth(0.5)
          .moveTo(startX, 792 - 35)
          .lineTo(startX + contentWidth, 792 - 35)
          .stroke();

        doc
          .font('Helvetica')
          .fontSize(7)
          .fillColor('#94a3b8')
          .text(
            `Confidential Student Record • System ARN: ${applicationNumber} • Academic Demonstration Project`,
            startX,
            792 - 28,
            { width: contentWidth / 2 }
          )
          .text(
            `Page ${i + 1} of ${range.count}`,
            startX + contentWidth / 2,
            792 - 28,
            { width: contentWidth / 2, align: 'right' }
          );
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Saves a submitted application's PDF to private disk storage.
 */
async function saveSubmittedPdf(applicationId, pdfBuffer, cycleNumber = null) {
  await ensureApplicationStorageDir();
  const filePath = getApplicationPdfPath(applicationId, cycleNumber);
  await fs.promises.writeFile(filePath, pdfBuffer);
  return filePath;
}

module.exports = {
  generateApplicationPdfBuffer,
  getApplicationPdfPath,
  hasSubmittedPdf,
  saveSubmittedPdf,
};
