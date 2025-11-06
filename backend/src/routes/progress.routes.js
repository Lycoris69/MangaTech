const express = require('express');
const router = express.Router();
const progressController = require('../controllers/progress.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', progressController.getUserProgress);
router.post('/', progressController.updateProgress);
router.get('/manga/:manga_id/last', progressController.getLastRead);

module.exports = router;
