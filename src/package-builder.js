const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const OUTPUT_DIR = process.env.OUTPUT_DIR || './outputs';

function getRunDir(date = new Date()) {
  const dateStr = date.toISOString().split('T')[0];
  const dir = path.join(OUTPUT_DIR, dateStr);
  fs.mkdirSync(dir, { recursive: true });
  return { dir, dateStr };
}

function saveTrends(trends, runDir) {
  fs.writeFileSync(path.join(runDir, 'trends.json'), JSON.stringify(trends, null, 2));
}

function saveIndustryMatches(matches, runDir) {
  fs.writeFileSync(path.join(runDir, 'industry-matches.json'), JSON.stringify(matches, null, 2));
}

function saveContent(contentItems, runDir) {
  fs.writeFileSync(path.join(runDir, 'content.json'), JSON.stringify(contentItems, null, 2));
}

function buildPackageMd(dateStr, trends, matches, contentItems) {
  const nextRun = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0];
  const urgent = matches.filter(m => m.priority === 'URGENT');
  const high = matches.filter(m => m.priority === 'HIGH');

  let md = `# ValuConnect Content Brief — ${dateStr}\n`;
  md += `# Next run: ${nextRun}\n\n`;

  if (urgent.length > 0) {
    md += `> ⚠️ URGENT: ${urgent.length} topic(s) flagged for immediate publish\n\n`;
  }

  md += `## TOP VIRAL TOPICS THIS CYCLE\n\n`;

  matches.forEach((match, i) => {
    md += `#${i + 1} ${match.title}\n`;
    md += `    Source: ${match.source} | Outlier Score: ${match.outlierScore} | Priority: ${match.priority}\n`;
    md += `    Industry Match: ${match.industry} (relevance: ${match.relevanceScore}%)\n`;
    md += `    Angle: ${match.angle}\n`;
    md += `    Hook: ${match.hook}\n\n`;
  });

  md += `## READY-TO-PUBLISH CONTENT\n\n`;

  contentItems.forEach((item, i) => {
    if (!item) return;
    md += `---\n\n### Topic #${i + 1}: ${item.topic}\n\n`;

    if (item.linkedin) {
      md += `#### LinkedIn Story Post (English)\n\n${item.linkedin.linkedin_story_en}\n\n`;
      md += `#### LinkedIn Story Post (Spanish)\n\n${item.linkedin.linkedin_story_es}\n\n`;
      md += `#### LinkedIn List Post\n\n${item.linkedin.linkedin_list_en}\n\n`;
    }

    if (item.instagram) {
      md += `#### Instagram Reel Script (English)\n\n${item.instagram.reel_script_en}\n\n`;
      md += `#### Instagram Caption (English)\n\n${item.instagram.caption_en}\n\n`;
    }

    if (item.facebook) {
      md += `#### Facebook Post (Bilingual)\n\n${item.facebook.facebook_post}\n\n`;
    }

    if (item.tiktok) {
      md += `#### TikTok Script (English)\n\n${item.tiktok.tiktok_script_en}\n\n`;
      md += `**Hook A:** ${item.tiktok.hook_a}\n`;
      md += `**Hook B:** ${item.tiktok.hook_b}\n\n`;
    }
  });

  md += `## SUGGESTED PUBLISH SCHEDULE\n\n`;
  if (contentItems[0]) md += `Monday: LinkedIn story (Topic #1) | Instagram carousel (Topic #1)\n`;
  if (contentItems[0]) md += `Tuesday: TikTok reel (Topic #1) | Instagram reel (Topic #1)\n`;
  if (contentItems[1]) md += `Wednesday: LinkedIn list (Topic #2) | Facebook bilingual (Topic #2)\n`;
  if (contentItems[1]) md += `Thursday: Instagram carousel (Topic #2)\n`;
  if (contentItems[2]) md += `Friday: LinkedIn win post (Topic #3) | TikTok trend (Topic #3)\n`;

  return md;
}

function assemblePackage(trends, matches, contentItems) {
  const { dir, dateStr } = getRunDir();

  saveTrends(trends, dir);
  saveIndustryMatches(matches, dir);
  saveContent(contentItems.filter(Boolean), dir);

  const md = buildPackageMd(dateStr, trends, matches, contentItems);
  fs.writeFileSync(path.join(dir, 'package.md'), md);

  logger.info(`Package assembled in ${dir}`);
  logger.info(`Topics: ${matches.length} | Content pieces generated: ${contentItems.filter(Boolean).length}`);

  return { dir, dateStr, packagePath: path.join(dir, 'package.md') };
}

module.exports = { assemblePackage };
