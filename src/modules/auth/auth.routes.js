const { Router } = require('express');
const authController = require('./auth.controller');
const { requireAuth } = require('./auth.middleware');

const router = Router();

// Public routes
router.post('/register', (req, res, next) => authController.register(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Protected session route
router.get('/me', requireAuth, (req, res, next) => authController.getCurrentUser(req, res, next));

module.exports = router;
