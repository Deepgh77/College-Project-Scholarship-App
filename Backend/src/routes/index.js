const { Router } = require('express');
const healthRoutes = require('../modules/health/health.routes');
const authRoutes = require('../modules/auth/auth.routes');
const studentProfileRoutes = require('../modules/student-profile/student-profile.routes');
const scholarshipRoutes = require('../modules/scholarship/scholarship.routes');
const documentRoutes = require('../modules/document/document.routes');
const applicationRoutes = require('../modules/application/application.routes');
const collegeRoutes = require('../modules/college/college.routes');
const authorityRoutes = require('../modules/authority/authority.routes');
const adminPaymentRoutes = require('../modules/payment/payment.routes');
const adminRoutes = require('../modules/admin/admin.routes');

const router = Router();

// Mount module routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/student', studentProfileRoutes);
router.use('/scholarships', scholarshipRoutes);
router.use('/documents', documentRoutes);
router.use('/applications', applicationRoutes);
router.use('/college', collegeRoutes);
router.use('/authority', authorityRoutes);
router.use('/admin/payments', adminPaymentRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
