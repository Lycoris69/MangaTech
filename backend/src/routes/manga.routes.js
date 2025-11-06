const express = require('express');
const router = express.Router();
const mangaController = require('../controllers/manga.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.use(authMiddleware);

router.get('/', mangaController.getAll);
router.get('/:id', mangaController.getById);
router.post('/', mangaController.create);
router.put('/:id', mangaController.update);
router.delete('/:id', mangaController.delete);

module.exports = router;
