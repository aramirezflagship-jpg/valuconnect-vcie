const Anthropic = require('@anthropic-ai/sdk');
const logger = require('./logger');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const RELEVANCE_THRESHOLD = parseInt(process.env.RELEVANCE_THRESHOLD || '60', 10);

const industries = require('../config/industries.json').industries;

async function matchTopicToIndustry(topic) {
  const industryList = industries.map(i => ({
    id: i.id,
    name: i.name,
    keywords: i.viral_keywords,
    pillar: i.content_pillar,
    pain_points: i.pain_points
  }));

  const prompt = `Viral topic: "${topic.title}"
Source: ${topic.source} | Outlier Score: ${topic.outlierScore}

From the 8 ValuConnect industries below, select the BEST match.

Return ONLY valid JSON (no markdown, no explanation):
{
  "industryId": "<id>",
  "matchScore": <0-100>,
  "relevanceScore": <0-100>,
  "angle": "<how this viral topic connects to this industry's specific pain points>",
  "hook": "<opening line for a post using this topic — warm, first-person, specific to the industry>"
}

matchScore = how well the topic fits the industry
relevanceScore = how relevant this topic is to ValuConnect's audience (small biz, ops, workflow, Latino/Hispanic business)

Industries:
${JSON.stringify(industryList, null, 2)}`;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }]
    });

    const raw = response.content[0].text.trim();
    const match = JSON.parse(raw);

    if (match.relevanceScore < RELEVANCE_THRESHOLD) {
      logger.info(`Topic dropped — relevance ${match.relevanceScore}% below threshold`, { title: topic.title });
      return null;
    }

    const industry = industries.find(i => i.id === match.industryId);
    return { ...topic, industry: match.industryId, industryData: industry, matchScore: match.matchScore, relevanceScore: match.relevanceScore, angle: match.angle, hook: match.hook };
  } catch (err) {
    logger.error(`Industry matching failed for: ${topic.title}`, { error: err.message });
    return null;
  }
}

async function matchAllTopics(topics) {
  logger.info(`Industry matcher: processing ${topics.length} topics`);
  const results = await Promise.all(topics.map(t => matchTopicToIndustry(t)));
  const matched = results.filter(Boolean);
  logger.info(`Industry matcher: ${matched.length} topics matched (${topics.length - matched.length} dropped by relevance filter)`);
  return matched;
}

module.exports = { matchAllTopics, matchTopicToIndustry };
