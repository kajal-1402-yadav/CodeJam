const express = require('express');
const router = express.Router();
const { executeCode } = require('../controllers/executeController');

const requireAuth = require('../middleware/requireAuth');

// All execution routes require authentication
router.use(requireAuth);

// Execute code in any supported language
router.post('/execute', executeCode);

module.exports = router;
