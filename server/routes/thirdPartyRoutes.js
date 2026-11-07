const express = require('express');
const router = express.Router();
const thirdPartyController = require('../controllers/thirdPartyController');
const { requireAdmin } = require('../middleware/auth');

// Public search on 3rd party providers
router.get('/search', thirdPartyController.search3rdParty);
router.get('/details/:id', thirdPartyController.get3rdPartyDetails);

// 1-Click Import into local database (Admin)
router.post('/import', requireAdmin, thirdPartyController.importFrom3rdParty);

module.exports = router;
