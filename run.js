require('dotenv').config();
const logger = require('./src/logger');
const { scanAllSources } = require('./src/trend-scanner');
const { scoreTopics } = require('./src/outlier-engine');
const { matchAllTopics } = require('./src/industry-matcher');
const { generateAllContent } = require('./src/content-generator');
const { assemblePackage } = require('./src/package-builder');

const MAX_TOPICS = parseInt(process.env.MAX_TOPICS_PER_RUN || '5', 10);

async function run() {
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  logger.runStart(runId);

  try {
    // Step 1: Scan
    const rawTopics = await scanAllSources();

    // Step 2: Score
    const { toGenerate, monitoring, all } = scoreTopics(rawTopics);
    logger.info(`Scored: ${toGenerate.length} to generate, ${monitoring.length} monitoring`);

    // Step 3: Match industries (limit to MAX_TOPICS)
    const topTopics = toGenerate.slice(0, MAX_TOPICS);
    const matched = await matchAllTopics(topTopics);

    if (matched.length === 0) {
      logger.warn('No topics passed the relevance filter this cycle');
      logger.runEnd(runId, { topics: 0, content: 0 });
      return;
    }

    // Step 4: Generate content
    const contentItems = await Promise.all(matched.map(t => generateAllContent(t)));

    // Step 5: Assemble package
    const { packagePath, dateStr } = assemblePackage(all, matched, contentItems);

    logger.runEnd(runId, {
      date: dateStr,
      topicsScanned: rawTopics.length,
      topicsGenerated: matched.length,
      contentPackage: packagePath
    });

    console.log(`\nContent brief ready: ${packagePath}`);
  } catch (err) {
    logger.error('Pipeline failed', { error: err.message, stack: err.stack });
    process.exit(1);
  }
}

run();
