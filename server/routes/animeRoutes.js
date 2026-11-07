const express = require('express');
const router = express.Router();
const animeController = require('../controllers/animeController');
const { optionalAuth, requireAuth } = require('../middleware/auth');

router.get('/', animeController.getAnimeList);
router.get('/trending', animeController.getTrending);
router.get('/popular', animeController.getPopular);
router.get('/latest', animeController.getLatest);
router.get('/seasons', animeController.getSeasonal);
router.get('/featured', animeController.getFeatured);
router.get('/genres', animeController.getGenres);
router.get('/search', animeController.search);
router.get('/:slug', optionalAuth, animeController.getAnimeBySlug);
router.post('/:id/rate', requireAuth, animeController.rateAnime);

module.exports = router;
