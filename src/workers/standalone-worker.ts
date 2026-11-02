import { createClassifyWorker, createRssWorker, scheduleClassification, scheduleFeedSync } from '../lib/queue';

console.log('🚀 Starting EngFeed Standalone Ingestion Worker Process...');

const worker = createRssWorker();
const classifyWorker = createClassifyWorker();

// Schedule automated feed sync every 2 hours. The first run fires as soon as the schedule is created.
scheduleFeedSync().then(() => {
  console.log('⏱️ Automated 2-hour RSS polling schedule activated.');
}).catch((err) => {
  console.error('Failed to schedule RSS polling:', err);
});

scheduleClassification().catch((err) => {
  console.error('Failed to schedule article classification:', err);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Stopping worker...');
  await Promise.all([worker.close(), classifyWorker.close()]);
  process.exit(0);
});
