const { z } = require('zod');

// Schema for public student registration
const registerSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long'),
    confirmPassword: z.string().optional(),
    role: z
      .literal('STUDENT', {
        errorMap: () => ({ message: 'Public registration is permitted for STUDENT role only' }),
      })
      .optional(),
  })
  .refine(
    (data) => {
      if (data.confirmPassword && data.password !== data.confirmPassword) {
        return false;
      }
      return true;
    },
    {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }
  );

// Schema for user login
const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Please enter a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
};
