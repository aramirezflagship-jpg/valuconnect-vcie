const logger = require('./logger');

const OUTLIER_THRESHOLD = parseInt(process.env.OUTLIER_THRESHOLD || '300', 10);

function scoreYouTube(topic, channelAverageViews = 10000) {
  const views = topic.views || 0;
  return Math.round((views / channelAverageViews) * 100);
}

function scoreReddit(topic, subredditAverageUpvotes = 100) {
  const upvotes = topic.upvotes || 0;
  return Math.round((upvotes / subredditAverageUpvotes) * 100);
}

function scoreGoogleTrends(topic) {
  return topic.breakout_score || 0;
}

function getPriority(score) {
  if (score >= 700) return 'URGENT';
  if (score >= 500) return 'HIGH';
  if (score >= 300) return 'STANDARD';
  if (score >= 150) return 'MONITOR';
  return 'SKIP';
}

function scoreTopics(rawTopics) {
  const scored = rawTopics.map(topic => {
    let outlierScore = 0;

    switch (topic.source) {
      case 'youtube':
        outlierScore = scoreYouTube(topic);
        break;
      case 'reddit':
        outlierScore = scoreReddit(topic);
        break;
      case 'google_trends':
        outlierScore = scoreGoogleTrends(topic);
        break;
      default:
        outlierScore = topic.relevance_score || 0;
    }

    return { ...topic, outlierScore, priority: getPriority(outlierScore) };
  });

  const ranked = scored
    .filter(t => t.outlierScore >= 150)
    .sort((a, b) => b.outlierScore - a.outlierScore);

  const toGenerate = ranked.filter(t => t.outlierScore >= OUTLIER_THRESHOLD);
  const monitoring = ranked.filter(t => t.outlierScore < OUTLIER_THRESHOLD);

  logger.info(`Outlier engine: ${toGenerate.length} topics to generate, ${monitoring.length} monitoring`);

  if (toGenerate.length > 0) {
    logger.info('Top topics:', toGenerate.slice(0, 3).map(t => ({
      title: t.title,
      score: t.outlierScore,
      priority: t.priority
    })));
  }

  return { toGenerate, monitoring, all: ranked };
}

module.exports = { scoreTopics, getPriority };
