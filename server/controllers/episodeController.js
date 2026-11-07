const db = require('../database/db');

function getEpisodeDetails(req, res, next) {
  try {
    const { id } = req.params;
    const episode = db.getEpisodeById(id);

    if (!episode) {
      return res.status(404).json({
        success: false,
        error: 'Episode not found'
      });
    }

    const anime = db.getAnimeById(episode.anime_id);
    const allEpisodes = db.getEpisodesByAnimeId(episode.anime_id);

    const currentIndex = allEpisodes.findIndex(e => e.id === episode.id);
    const prevEpisode = currentIndex > 0 ? { id: allEpisodes[currentIndex - 1].id, episode_number: allEpisodes[currentIndex - 1].episode_number, title: allEpisodes[currentIndex - 1].title } : null;
    const nextEpisode = currentIndex < allEpisodes.length - 1 ? { id: allEpisodes[currentIndex + 1].id, episode_number: allEpisodes[currentIndex + 1].episode_number, title: allEpisodes[currentIndex + 1].title } : null;

    let resumeSeconds = 0;
    if (req.user) {
      resumeSeconds = db.getPlaybackPosition(req.user.id, episode.id);
    }

    const commentsCount = db.getEpisodeComments(episode.id).length;

    res.json({
      success: true,
      episode,
      anime: anime ? { id: anime.id, slug: anime.slug, title: anime.title, banner_url: anime.banner_url, poster_url: anime.poster_url } : null,
      allEpisodes: allEpisodes.map(e => ({
        id: e.id,
        episode_number: e.episode_number,
        title: e.title,
        duration: e.duration,
        thumbnail_url: e.thumbnail_url
      })),
      prevEpisode,
      nextEpisode,
      resumeSeconds,
      commentsCount
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getEpisodeDetails
};
