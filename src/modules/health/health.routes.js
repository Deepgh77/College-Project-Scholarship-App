const { Router } = require('express');
const healthController = require('./health.controller');

const router = Router();

// GET /api/health
router.get('/', (req, res, next) => healthController.getHealth(req, res, next));

module.exports = router;
