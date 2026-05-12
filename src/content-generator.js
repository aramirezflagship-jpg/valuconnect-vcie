const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');
const { getSystemPrompt, buildIndustryPrompt } = require('./brand-context');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

function getModel() {
  return genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: getSystemPrompt()
  });
}

function cleanJSON(raw) {
  return raw.trim().replace(/^```json\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '');
}

async function generateLinkedIn(topic, industry) {
  const contextBlock = buildIndustryPrompt(topic, industry);
  const prompt = `${contextBlock}

Generate TWO LinkedIn posts for this viral topic + industry match:

POST 1 — Story (English): 150-220 words. Structure: Hook → Pain → Insight → Result → CTA (engagement question). Max 5 hashtags. Write as Andres, first person.

POST 2 — Story (Spanish): Natural conversational Spanish version of Post 1. Include #NegocioLatino and #AutomatizacionDeNegocios.

Return JSON only:
{
  "linkedin_story_en": "<full post text>",
  "linkedin_story_es": "<full post text>",
  "linkedin_list_en": "<5-7 item numbered list post, each item starts with action verb, ends with Save this.>"
}`;

  const result = await getModel().generateContent(prompt);
  return JSON.parse(cleanJSON(result.response.text()));
}

async function generateInstagram(topic, industry) {
  const contextBlock = buildIndustryPrompt(topic, industry);
  const prompt = `${contextBlock}

Generate Instagram content for this viral topic + industry match.

Return JSON only:
{
  "reel_script_en": "<30-45 second spoken script. Hook in first 2 seconds. Short punchy sentences.>",
  "reel_script_es": "<Spanish version of reel script>",
  "caption_en": "<Hook under 15 words first line. 6-8 hashtags including #NegocioLatino.>",
  "caption_es": "<Spanish caption with same hashtag rules>",
  "carousel_slides": [
    {"slide": 1, "title": "<cover title>", "body": "<brief text>"},
    {"slide": 2, "title": "<5 words max>", "body": "<one insight>"},
    {"slide": 3, "title": "<5 words max>", "body": "<one insight>"},
    {"slide": 4, "title": "<5 words max>", "body": "<one insight>"},
    {"slide": 5, "title": "<5 words max>", "body": "<one insight>"},
    {"slide": 6, "title": "<5 words max>", "body": "<one insight>"},
    {"slide": 7, "title": "Book Your Free Call", "body": "<CTA text>"}
  ],
  "on_screen_overlays": ["<text 1>", "<text 2>", "<text 3>", "<text 4>"]
}`;

  const result = await getModel().generateContent(prompt);
  return JSON.parse(cleanJSON(result.response.text()));
}

async function generateFacebook(topic, industry) {
  const contextBlock = buildIndustryPrompt(topic, industry);
  const prompt = `${contextBlock}

Generate a Facebook bilingual community post (100-200 words total). Warmer tone than LinkedIn. English section first, then Spanish section in same post. Max 2 hashtags. End with an engagement question in both languages.

Return JSON only:
{
  "facebook_post": "<full bilingual post — EN section then ES section>",
  "engagement_question_en": "<standalone engagement question>",
  "engagement_question_es": "<standalone engagement question in Spanish>"
}`;

  const result = await getModel().generateContent(prompt);
  return JSON.parse(cleanJSON(result.response.text()));
}

async function generateTikTok(topic, industry) {
  const contextBlock = buildIndustryPrompt(topic, industry);
  const prompt = `${contextBlock}

Generate TikTok video scripts for this viral topic + industry match.

Return JSON only:
{
  "tiktok_script_en": "<30-45 second spoken script. Hook in first 2 seconds. Mark [ON SCREEN: text] for overlays (max 6 words each, 4 total).>",
  "tiktok_script_es": "<Spanish version>",
  "hook_a": "<Hook option A — first 2 seconds>",
  "hook_b": "<Hook option B — alternate first 2 seconds>",
  "hook_a_es": "<Spanish hook A>",
  "hook_b_es": "<Spanish hook B>"
}`;

  const result = await getModel().generateContent(prompt);
  return JSON.parse(cleanJSON(result.response.text()));
}

async function generateAllContent(matchedTopic) {
  const { industryData } = matchedTopic;
  logger.info(`Generating content for: "${matchedTopic.title}" → ${matchedTopic.industry}`);

  try {
    const [linkedin, instagram, facebook, tiktok] = await Promise.all([
      generateLinkedIn(matchedTopic, industryData),
      generateInstagram(matchedTopic, industryData),
      generateFacebook(matchedTopic, industryData),
      generateTikTok(matchedTopic, industryData)
    ]);

    return { topic: matchedTopic.title, source: matchedTopic.source, outlierScore: matchedTopic.outlierScore, industry: matchedTopic.industry, hook: matchedTopic.hook, linkedin, instagram, facebook, tiktok };
  } catch (err) {
    logger.error(`Content generation failed for: ${matchedTopic.title}`, { error: err.message });
    return null;
  }
}

module.exports = { generateAllContent, generateLinkedIn, generateInstagram, generateFacebook, generateTikTok };
