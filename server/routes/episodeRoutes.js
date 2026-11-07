const express = require('express');
const router = express.Router();
const episodeController = require('../controllers/episodeController');
const { optionalAuth } = require('../middleware/auth');

router.get('/:id', optionalAuth, episodeController.getEpisodeDetails);

module.exports = router;
