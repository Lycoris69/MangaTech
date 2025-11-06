const express = require('express');
const router = express.Router();
const chapterController = require('../controllers/chapter.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/manga/:manga_id', chapterController.getChaptersByManga);
router.get('/:id', chapterController.getById);
router.post('/', chapterController.create);
router.delete('/:id', chapterController.delete);

module.exports = router;
