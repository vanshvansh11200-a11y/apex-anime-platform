const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

// Dashboard metrics
router.get('/stats', adminController.getStats);

// Anime management
router.post('/anime', adminController.createAnime);
router.put('/anime/:id', adminController.updateAnime);
router.delete('/anime/:id', adminController.deleteAnime);

// Episode & Folder management
router.get('/anime/:animeId/episodes', adminController.getAnimeEpisodes);
router.post('/episodes', adminController.createEpisode);
router.put('/episodes/:id', adminController.updateEpisode);
router.delete('/episodes/:id', adminController.deleteEpisode);
router.post('/quick-publish', adminController.quickPublish);
router.post('/quick_publish', adminController.quickPublish);

// User management
router.get('/users', adminController.getUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// Direct Video Upload from Phone/Device
router.post('/upload-video', adminController.uploadVideo);

// AI Auto-Fill / Metadata Enrichment
router.get('/ai-enrich', adminController.aiEnrich);

// Bot management
router.get('/bot/status', adminController.getBotStatus);
router.post('/bot/config', adminController.saveBotConfig);
router.post('/bot/stop', adminController.stopBot);

module.exports = router;
