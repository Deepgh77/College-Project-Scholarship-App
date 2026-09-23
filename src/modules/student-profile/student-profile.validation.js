const { z } = require('zod');

const genderEnum = z.enum(['MALE', 'FEMALE', 'OTHER'], {
  errorMap: () => ({ message: 'Invalid gender value' }),
});

const casteCategoryEnum = z.enum(['OPEN', 'OBC', 'SC', 'ST', 'VJNT', 'SBC', 'EWS'], {
  errorMap: () => ({ message: 'Invalid caste category value' }),
});

const preprocessNumber = (schema) =>
  z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? null : Number(val)),
    schema.nullable().optional()
  );

/**
 * Validation schema for creating or updating a student profile.
 * Supports partial saves so students can save progress gradually.
 * Unprovided or empty fields are accepted as null/empty without synthetic injection.
 */
const studentProfileSchema = z.object({
  // Personal Details
  fullName: z.string().trim().max(100, 'Full name cannot exceed 100 characters').optional().nullable(),
  dob: z
    .string()
    .refine((val) => !val || !isNaN(Date.parse(val)), { message: 'Invalid date of birth format' })
    .optional()
    .nullable(),
  gender: genderEnum.or(z.literal('')).optional().nullable(),
  category: casteCategoryEnum.or(z.literal('')).optional().nullable(),
  religion: z.string().trim().max(50).optional().nullable(),
  isHandicapped: z.boolean().optional().nullable(),
  disabilityPercentage: preprocessNumber(
    z.number().int('Disability percentage must be an integer').min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100')
  ),

  // Contact & Address Details
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Mobile number must be a valid 10-digit Indian number')
    .or(z.literal(''))
    .optional()
    .nullable(),
  address: z.string().trim().max(500, 'Address cannot exceed 500 characters').optional().nullable(),
  state: z.string().trim().max(100).optional().nullable(),
  district: z.string().trim().max(100).optional().nullable(),
  taluka: z.string().trim().max(100).optional().nullable(),
  cityVillage: z.string().trim().max(100).optional().nullable(),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be exactly 6 digits')
    .or(z.literal(''))
    .optional()
    .nullable(),

  // Academic Details
  collegeId: z.string().uuid('Please select a valid college').or(z.literal('')).optional().nullable(),
  courseName: z.string().trim().max(150).optional().nullable(),
  courseYear: preprocessNumber(
    z.number().int().min(1, 'Course year must be at least 1').max(6, 'Course year cannot exceed 6')
  ),
  admissionYear: preprocessNumber(
    z.number().int().min(2015, 'Admission year must be 2015 or later').max(2035, 'Admission year is too far in future')
  ),
  previousQualification: z.string().trim().max(100).optional().nullable(),
  previousPercentage: preprocessNumber(
    z.number().min(0, 'Percentage cannot be negative').max(100, 'Percentage cannot exceed 100')
  ),

  // Family / Income Details
  annualFamilyIncome: preprocessNumber(
    z.number().min(0, 'Annual income cannot be negative').max(100000000, 'Annual income amount is unreasonably large')
  ),
  guardianName: z.string().trim().max(100).optional().nullable(),

  // Bank Details
  bankAccountNo: z
    .string()
    .trim()
    .regex(/^\d{9,18}$/, 'Bank account number should be 9 to 18 digits')
    .or(z.literal(''))
    .optional()
    .nullable(),
  bankIfsc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format (e.g. SBIN0001234)')
    .or(z.literal(''))
    .optional()
    .nullable(),
  bankName: z.string().trim().max(100).optional().nullable(),
});

module.exports = {
  studentProfileSchema,
};
