const express = require('express');
const router = express.Router();
const bookmarkController = require('../controllers/bookmark.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', bookmarkController.getUserBookmarks);
router.post('/', bookmarkController.addBookmark);
router.put('/:id', bookmarkController.updateBookmark);
router.delete('/:id', bookmarkController.deleteBookmark);

module.exports = router;
