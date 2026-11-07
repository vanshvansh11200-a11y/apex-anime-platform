const db = require('../database/db');

function getHistory(req, res, next) {
  try {
    const history = db.getUserHistory(req.user.id);
    res.json({
      success: true,
      items: history
    });
  } catch (err) {
    next(err);
  }
}

function saveProgress(req, res, next) {
  try {
    const { anime_id, episode_id, progress_seconds, total_seconds } = req.body;
    if (!anime_id || !episode_id) {
      return res.status(400).json({
        success: false,
        error: 'anime_id and episode_id are required'
      });
    }

    const prog = parseFloat(progress_seconds) || 0;
    const total = parseFloat(total_seconds) || 0;

    const record = db.savePlaybackProgress(req.user.id, anime_id, episode_id, prog, total);
    res.json({
      success: true,
      record
    });
  } catch (err) {
    next(err);
  }
}

function clearHistory(req, res, next) {
  try {
    db.clearUserHistory(req.user.id);
    res.json({
      success: true,
      message: 'Watch history cleared successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getHistory,
  saveProgress,
  clearHistory
};
