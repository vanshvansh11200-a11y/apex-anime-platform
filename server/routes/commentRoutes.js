const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { requireAuth } = require('../middleware/auth');

router.get('/episode/:episodeId', commentController.getComments);
router.post('/', requireAuth, commentController.addComment);
router.delete('/:id', requireAuth, commentController.deleteComment);

module.exports = router;
