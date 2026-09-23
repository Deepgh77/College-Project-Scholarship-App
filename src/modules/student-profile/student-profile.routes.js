const { Router } = require('express');
const studentProfileController = require('./student-profile.controller');
const { requireAuth, requireRole } = require('../auth/auth.middleware');

const router = Router();

// Protect all student profile endpoints: requires authenticated user with STUDENT role
router.use(requireAuth);
router.use(requireRole('STUDENT'));

// Student Profile & Dashboard endpoints
router.get('/dashboard', (req, res, next) => studentProfileController.getDashboard(req, res, next));
router.get('/profile', (req, res, next) => studentProfileController.getProfile(req, res, next));
router.put('/profile', (req, res, next) => studentProfileController.saveProfile(req, res, next));
router.get('/colleges', (req, res, next) => studentProfileController.getColleges(req, res, next));

module.exports = router;
