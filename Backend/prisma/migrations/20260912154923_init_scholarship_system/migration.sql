-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'COLLEGE', 'AUTHORITY', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "CasteCategory" AS ENUM ('OPEN', 'OBC', 'SC', 'ST', 'VJNT', 'SBC', 'EWS');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('INCOME_CERT', 'CASTE_CERT', 'DOMICILE_CERT', 'MARKSHEET_PREV', 'FEE_RECEIPT', 'RATION_CARD', 'DISABILITY_CERT', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('AVAILABLE', 'NEEDS_UPDATE', 'NEEDS_CORRECTION');

-- CreateEnum
CREATE TYPE "RuleOperator" AS ENUM ('LTE', 'GTE', 'EQ', 'NEQ', 'IN');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_COLLEGE_REVIEW', 'COLLEGE_SENT_BACK', 'COLLEGE_REJECTED', 'FORWARDED_TO_AUTHORITY', 'UNDER_AUTHORITY_REVIEW', 'AUTHORITY_SENT_BACK', 'AUTHORITY_REJECTED', 'RESUBMITTED_TO_COLLEGE', 'APPROVED', 'PAYMENT_PROCESSING', 'PAYMENT_INITIATED', 'DISBURSED', 'UNDISBURSED', 'CANCELLED', 'RIGHT_TO_GIVE_UP');

-- CreateEnum
CREATE TYPE "ReviewerRole" AS ENUM ('COLLEGE', 'AUTHORITY');

-- CreateEnum
CREATE TYPE "ReviewDecision" AS ENUM ('VERIFY_FORWARD', 'SEND_BACK', 'REJECT', 'APPROVE');

-- CreateEnum
CREATE TYPE "CorrectionSection" AS ENUM ('PERSONAL', 'ACADEMIC', 'FINANCIAL', 'DOCUMENT', 'ELIGIBILITY');

-- CreateEnum
CREATE TYPE "RejectionCategory" AS ENUM ('INCORRECT_DOCUMENT', 'EXPIRED_DOCUMENT', 'INFORMATION_MISMATCH', 'ELIGIBILITY_NOT_MET', 'UNREADABLE_DOCUMENT', 'ACADEMIC_INCORRECT', 'OTHER');

-- CreateEnum
CREATE TYPE "CorrectionStatus" AS ENUM ('OPEN', 'RESOLVED_BY_STUDENT', 'ACCEPTED', 'RE_FLAGGED');

-- CreateEnum
CREATE TYPE "PaymentBatchStatus" AS ENUM ('PREPARED', 'PROCESSING', 'DISBURSED', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('PENDING', 'PROCESSING', 'INITIATED', 'DISBURSED', 'UNDISBURSED');

-- CreateEnum
CREATE TYPE "GrievanceCategory" AS ENUM ('APPLICATION', 'DOCUMENT', 'VERIFICATION', 'PAYMENT', 'TECHNICAL', 'OTHER');

-- CreateEnum
CREATE TYPE "GrievanceStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "GrievanceAssignedRole" AS ENUM ('COLLEGE', 'AUTHORITY', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationCategory" AS ENUM ('ACTION_REQUIRED', 'STATUS_UPDATE', 'PAYMENT', 'GRIEVANCE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActorRole" AS ENUM ('STUDENT', 'COLLEGE', 'AUTHORITY', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "collegeId" TEXT,
    "departmentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "College" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "university" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "taluka" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "College_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "dob" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "category" "CasteCategory" NOT NULL,
    "religion" TEXT,
    "isHandicapped" BOOLEAN NOT NULL DEFAULT false,
    "disabilityPercentage" INTEGER,
    "mobile" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'Maharashtra',
    "district" TEXT NOT NULL,
    "taluka" TEXT NOT NULL,
    "cityVillage" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "courseName" TEXT NOT NULL,
    "courseYear" INTEGER NOT NULL,
    "admissionYear" INTEGER NOT NULL,
    "previousQualification" TEXT NOT NULL,
    "previousPercentage" DECIMAL(5,2) NOT NULL,
    "annualFamilyIncome" DECIMAL(12,2) NOT NULL,
    "guardianName" TEXT NOT NULL,
    "bankAccountNo" TEXT NOT NULL,
    "bankIfsc" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "completionPercentage" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isCompressed" BOOLEAN NOT NULL DEFAULT false,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scholarship" (
    "id" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "benefitAmount" DECIMAL(10,2) NOT NULL,
    "applicationStartDate" TIMESTAMP(3) NOT NULL,
    "applicationEndDate" TIMESTAMP(3) NOT NULL,
    "isFreshAllowed" BOOLEAN NOT NULL DEFAULT true,
    "isRenewalAllowed" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scholarship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarshipRule" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "ruleGroup" TEXT NOT NULL DEFAULT 'DEFAULT',
    "fieldPath" TEXT NOT NULL,
    "operator" "RuleOperator" NOT NULL,
    "targetValue" JSONB NOT NULL,
    "failureReasonText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScholarshipRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScholarshipRequiredDoc" (
    "id" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "helpTitle" TEXT NOT NULL,
    "helpTextSimple" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScholarshipRequiredDoc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "applicationNumber" TEXT,
    "studentId" TEXT NOT NULL,
    "scholarshipId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "isRenewal" BOOLEAN NOT NULL DEFAULT false,
    "previousApplicationId" TEXT,
    "healthScore" INTEGER NOT NULL DEFAULT 0,
    "draftDataJson" JSONB,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationSnapshot" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "snapshotDataJson" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationDocumentSnapshot" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "documentVersionId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationDocumentSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationReview" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "reviewerUserId" TEXT NOT NULL,
    "reviewerRole" "ReviewerRole" NOT NULL,
    "decision" "ReviewDecision" NOT NULL,
    "checklistJson" JSONB NOT NULL,
    "overallRemarks" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationCorrectionRequest" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "cycleNumber" INTEGER NOT NULL,
    "reviewerRole" "ReviewerRole" NOT NULL,
    "affectedSection" "CorrectionSection" NOT NULL,
    "affectedField" TEXT,
    "affectedDocumentType" "DocumentType",
    "rejectionCategory" "RejectionCategory" NOT NULL,
    "reasonText" TEXT NOT NULL,
    "actionRequiredText" TEXT NOT NULL,
    "status" "CorrectionStatus" NOT NULL DEFAULT 'OPEN',
    "studentResponseText" TEXT,
    "resolvedDocumentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "ApplicationCorrectionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentBatch" (
    "id" TEXT NOT NULL,
    "batchNumber" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "status" "PaymentBatchStatus" NOT NULL DEFAULT 'PREPARED',
    "totalApplications" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "initiatedAt" TIMESTAMP(3),
    "disbursedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "batchId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'PENDING',
    "simulationReference" TEXT,
    "failureReason" TEXT,
    "disbursedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grievance" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "applicationId" TEXT,
    "category" "GrievanceCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "attachmentPath" TEXT,
    "status" "GrievanceStatus" NOT NULL DEFAULT 'OPEN',
    "assignedRole" "GrievanceAssignedRole" NOT NULL,
    "resolutionNotes" TEXT,
    "resolvedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grievance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "category" "NotificationCategory" NOT NULL,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApplicationAuditLog" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorRole" "ActorRole" NOT NULL,
    "action" TEXT NOT NULL,
    "previousStatus" "ApplicationStatus",
    "newStatus" "ApplicationStatus" NOT NULL,
    "remarks" TEXT,
    "ipAddress" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApplicationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_collegeId_idx" ON "User"("collegeId");

-- CreateIndex
CREATE INDEX "User_departmentId_idx" ON "User"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "College_code_key" ON "College"("code");

-- CreateIndex
CREATE INDEX "College_district_idx" ON "College"("district");

-- CreateIndex
CREATE INDEX "College_name_idx" ON "College"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_collegeId_idx" ON "StudentProfile"("collegeId");

-- CreateIndex
CREATE INDEX "StudentProfile_category_idx" ON "StudentProfile"("category");

-- CreateIndex
CREATE INDEX "Document_studentId_idx" ON "Document"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Document_studentId_documentType_key" ON "Document"("studentId", "documentType");

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentVersion_documentId_versionNumber_key" ON "DocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "Scholarship_departmentId_idx" ON "Scholarship"("departmentId");

-- CreateIndex
CREATE INDEX "Scholarship_academicYear_idx" ON "Scholarship"("academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "Scholarship_code_academicYear_key" ON "Scholarship"("code", "academicYear");

-- CreateIndex
CREATE INDEX "ScholarshipRule_scholarshipId_idx" ON "ScholarshipRule"("scholarshipId");

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipRule_scholarshipId_ruleGroup_fieldPath_operator_key" ON "ScholarshipRule"("scholarshipId", "ruleGroup", "fieldPath", "operator");

-- CreateIndex
CREATE INDEX "ScholarshipRequiredDoc_scholarshipId_idx" ON "ScholarshipRequiredDoc"("scholarshipId");

-- CreateIndex
CREATE UNIQUE INDEX "ScholarshipRequiredDoc_scholarshipId_documentType_key" ON "ScholarshipRequiredDoc"("scholarshipId", "documentType");

-- CreateIndex
CREATE UNIQUE INDEX "Application_applicationNumber_key" ON "Application"("applicationNumber");

-- CreateIndex
CREATE INDEX "Application_studentId_idx" ON "Application"("studentId");

-- CreateIndex
CREATE INDEX "Application_scholarshipId_idx" ON "Application"("scholarshipId");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_academicYear_idx" ON "Application"("academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "Application_studentId_scholarshipId_academicYear_key" ON "Application"("studentId", "scholarshipId", "academicYear");

-- CreateIndex
CREATE INDEX "ApplicationSnapshot_applicationId_idx" ON "ApplicationSnapshot"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationSnapshot_applicationId_cycleNumber_key" ON "ApplicationSnapshot"("applicationId", "cycleNumber");

-- CreateIndex
CREATE INDEX "ApplicationDocumentSnapshot_applicationId_idx" ON "ApplicationDocumentSnapshot"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationDocumentSnapshot_documentVersionId_idx" ON "ApplicationDocumentSnapshot"("documentVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "ApplicationDocumentSnapshot_applicationId_cycleNumber_docum_key" ON "ApplicationDocumentSnapshot"("applicationId", "cycleNumber", "documentType");

-- CreateIndex
CREATE INDEX "ApplicationReview_applicationId_idx" ON "ApplicationReview"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationReview_reviewerUserId_idx" ON "ApplicationReview"("reviewerUserId");

-- CreateIndex
CREATE INDEX "ApplicationCorrectionRequest_applicationId_idx" ON "ApplicationCorrectionRequest"("applicationId");

-- CreateIndex
CREATE INDEX "ApplicationCorrectionRequest_reviewId_idx" ON "ApplicationCorrectionRequest"("reviewId");

-- CreateIndex
CREATE INDEX "ApplicationCorrectionRequest_status_idx" ON "ApplicationCorrectionRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentBatch_batchNumber_key" ON "PaymentBatch"("batchNumber");

-- CreateIndex
CREATE INDEX "PaymentBatch_departmentId_idx" ON "PaymentBatch"("departmentId");

-- CreateIndex
CREATE INDEX "PaymentBatch_academicYear_idx" ON "PaymentBatch"("academicYear");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_applicationId_key" ON "PaymentRecord"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_simulationReference_key" ON "PaymentRecord"("simulationReference");

-- CreateIndex
CREATE INDEX "PaymentRecord_studentId_idx" ON "PaymentRecord"("studentId");

-- CreateIndex
CREATE INDEX "PaymentRecord_batchId_idx" ON "PaymentRecord"("batchId");

-- CreateIndex
CREATE INDEX "PaymentRecord_status_idx" ON "PaymentRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Grievance_ticketNumber_key" ON "Grievance"("ticketNumber");

-- CreateIndex
CREATE INDEX "Grievance_studentId_idx" ON "Grievance"("studentId");

-- CreateIndex
CREATE INDEX "Grievance_status_idx" ON "Grievance"("status");

-- CreateIndex
CREATE INDEX "Grievance_assignedRole_idx" ON "Grievance"("assignedRole");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "ApplicationAuditLog_applicationId_timestamp_idx" ON "ApplicationAuditLog"("applicationId", "timestamp");

-- CreateIndex
CREATE INDEX "ApplicationAuditLog_actorUserId_idx" ON "ApplicationAuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentVersion" ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Scholarship" ADD CONSTRAINT "Scholarship_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRule" ADD CONSTRAINT "ScholarshipRule_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScholarshipRequiredDoc" ADD CONSTRAINT "ScholarshipRequiredDoc_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_scholarshipId_fkey" FOREIGN KEY ("scholarshipId") REFERENCES "Scholarship"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_previousApplicationId_fkey" FOREIGN KEY ("previousApplicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationSnapshot" ADD CONSTRAINT "ApplicationSnapshot_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocumentSnapshot" ADD CONSTRAINT "ApplicationDocumentSnapshot_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationDocumentSnapshot" ADD CONSTRAINT "ApplicationDocumentSnapshot_documentVersionId_fkey" FOREIGN KEY ("documentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationReview" ADD CONSTRAINT "ApplicationReview_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationReview" ADD CONSTRAINT "ApplicationReview_reviewerUserId_fkey" FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationCorrectionRequest" ADD CONSTRAINT "ApplicationCorrectionRequest_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationCorrectionRequest" ADD CONSTRAINT "ApplicationCorrectionRequest_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "ApplicationReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationCorrectionRequest" ADD CONSTRAINT "ApplicationCorrectionRequest_resolvedDocumentVersionId_fkey" FOREIGN KEY ("resolvedDocumentVersionId") REFERENCES "DocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentBatch" ADD CONSTRAINT "PaymentBatch_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PaymentBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grievance" ADD CONSTRAINT "Grievance_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAuditLog" ADD CONSTRAINT "ApplicationAuditLog_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApplicationAuditLog" ADD CONSTRAINT "ApplicationAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
