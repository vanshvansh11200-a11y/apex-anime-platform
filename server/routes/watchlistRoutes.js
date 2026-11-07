const express = require('express');
const router = express.Router();
const watchlistController = require('../controllers/watchlistController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', watchlistController.getWatchlist);
router.post('/', watchlistController.updateWatchlist);
router.delete('/:animeId', watchlistController.removeFromWatchlist);

module.exports = router;
