const db = require('../database/db');

function getComments(req, res, next) {
  try {
    const { episodeId } = req.params;
    const comments = db.getEpisodeComments(episodeId);
    res.json({
      success: true,
      comments
    });
  } catch (err) {
    next(err);
  }
}

function addComment(req, res, next) {
  try {
    const { episode_id, anime_id, content, is_spoiler } = req.body;
    if (!episode_id || !anime_id || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide episode_id, anime_id, and comment text'
      });
    }

    if (content.trim().length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Comment cannot exceed 1000 characters'
      });
    }

    const comment = db.addComment(req.user.id, episode_id, anime_id, content, is_spoiler);
    res.status(201).json({
      success: true,
      comment
    });
  } catch (err) {
    next(err);
  }
}

function deleteComment(req, res, next) {
  try {
    const { id } = req.params;
    const isAdmin = req.user.role === 'admin';
    const deleted = db.deleteComment(id, req.user.id, isAdmin);

    if (!deleted) {
      return res.status(403).json({
        success: false,
        error: 'Could not delete comment or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getComments,
  addComment,
  deleteComment
};
