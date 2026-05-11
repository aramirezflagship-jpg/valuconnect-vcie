require('dotenv').config();
const cron = require('node-cron');
const logger = require('./src/logger');

const schedulerConfig = require('./config/scheduler.json');

logger.info(`VCIE Scheduler starting — cron: ${schedulerConfig.cron_expression}`);
logger.info(`Timezone: ${schedulerConfig.timezone}`);

cron.schedule(schedulerConfig.cron_expression, async () => {
  logger.info('Scheduled run triggered');
  try {
    require('./run');
  } catch (err) {
    logger.error('Scheduled run failed to start', { error: err.message });
  }
}, {
  timezone: schedulerConfig.timezone
});

logger.info('Scheduler running. Next run: every 48 hours at 6:00 AM ET');
logger.info('Press Ctrl+C to stop. Use pm2 for production deployment.');
