const db = require('../database/db');

function getWatchlist(req, res, next) {
  try {
    const list = db.getUserWatchlist(req.user.id);
    const { status } = req.query;

    let filtered = list;
    if (status && status !== 'all') {
      filtered = list.filter(item => item.status === status);
    }

    res.json({
      success: true,
      items: filtered,
      counts: {
        all: list.length,
        watching: list.filter(i => i.status === 'watching').length,
        plan_to_watch: list.filter(i => i.status === 'plan_to_watch').length,
        completed: list.filter(i => i.status === 'completed').length,
        dropped: list.filter(i => i.status === 'dropped').length
      }
    });
  } catch (err) {
    next(err);
  }
}

function updateWatchlist(req, res, next) {
  try {
    const { anime_id, status } = req.body;
    if (!anime_id || !status) {
      return res.status(400).json({
        success: false,
        error: 'Please provide anime_id and status'
      });
    }

    const validStatuses = ['watching', 'plan_to_watch', 'completed', 'dropped'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const item = db.setWatchlistStatus(req.user.id, anime_id, status);
    res.json({
      success: true,
      message: `Anime status updated to ${status}`,
      item
    });
  } catch (err) {
    next(err);
  }
}

function removeFromWatchlist(req, res, next) {
  try {
    const { animeId } = req.params;
    const removed = db.removeFromWatchlist(req.user.id, animeId);
    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Item not found in watchlist'
      });
    }
    res.json({
      success: true,
      message: 'Removed from watchlist'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getWatchlist,
  updateWatchlist,
  removeFromWatchlist
};
