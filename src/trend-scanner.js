const axios = require('axios');
const logger = require('./logger');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USER_AGENT = process.env.REDDIT_USER_AGENT || 'ValuConnect-VCIE/1.0';

const sources = require('../config/sources.json');

async function fetchYouTubeTrends() {
  const results = [];
  const publishedAfter = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  for (const term of sources.youtube.search_terms) {
    try {
      const res = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          key: YOUTUBE_API_KEY,
          q: term,
          type: 'video',
          part: 'snippet',
          order: 'viewCount',
          publishedAfter,
          maxResults: 5,
          relevanceLanguage: 'en'
        }
      });

      for (const item of res.data.items || []) {
        results.push({
          source: 'youtube',
          id: item.id.videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          published: item.snippet.publishedAt,
          search_term: term,
          raw: item.snippet
        });
      }
    } catch (err) {
      logger.warn(`YouTube fetch failed for term: ${term}`, { error: err.message });
    }
  }

  logger.info(`YouTube: fetched ${results.length} candidates`);
  return results;
}

async function fetchRedditTrends() {
  const results = [];

  let token;
  try {
    const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');
    const tokenRes = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      { headers: { Authorization: `Basic ${auth}`, 'User-Agent': REDDIT_USER_AGENT } }
    );
    token = tokenRes.data.access_token;
  } catch (err) {
    logger.warn('Reddit auth failed', { error: err.message });
    return results;
  }

  for (const sub of sources.reddit.subreddits) {
    try {
      const res = await axios.get(`https://oauth.reddit.com/r/${sub.name.replace('r/', '')}/hot`, {
        params: { limit: 10 },
        headers: { Authorization: `Bearer ${token}`, 'User-Agent': REDDIT_USER_AGENT }
      });

      for (const post of res.data.data.children || []) {
        const d = post.data;
        if (d.ups >= sources.reddit.min_upvotes) {
          results.push({
            source: 'reddit',
            id: d.id,
            title: d.title,
            subreddit: d.subreddit_name_prefixed,
            upvotes: d.ups,
            comments: d.num_comments,
            url: `https://reddit.com${d.permalink}`,
            published: new Date(d.created_utc * 1000).toISOString()
          });
        }
      }
    } catch (err) {
      logger.warn(`Reddit fetch failed for ${sub.name}`, { error: err.message });
    }
  }

  logger.info(`Reddit: fetched ${results.length} candidates`);
  return results;
}

async function scanAllSources() {
  logger.info('Trend scanner started');
  const [youtube, reddit] = await Promise.all([fetchYouTubeTrends(), fetchRedditTrends()]);
  const all = [...youtube, ...reddit];
  logger.info(`Total raw candidates: ${all.length}`);
  return all;
}

module.exports = { scanAllSources, fetchYouTubeTrends, fetchRedditTrends };
