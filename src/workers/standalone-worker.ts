import { createRssWorker, enqueueSyncJob } from '../lib/queue';

console.log('🚀 Starting EngFeed Standalone Ingestion Worker Process...');

const worker = createRssWorker();

// Schedule automated feed sync every 2 hours
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

console.log('⏱️ Automated 2-hour RSS polling schedule activated.');
setInterval(async () => {
  console.log('⏰ Cron trigger: Enqueueing full RSS feed sync...');
  await enqueueSyncJob();
}, TWO_HOURS_MS);

// Perform initial sync on worker startup
enqueueSyncJob().then(() => {
  console.log('📌 Initial feed sync job enqueued successfully.');
}).catch((err) => {
  console.error('Failed to enqueue initial sync job:', err);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Stopping worker...');
  await worker.close();
  process.exit(0);
});
