import { Queue, Worker, Job } from 'bullmq';
import { redis } from './redis';
import { syncCompanyFeed, syncAllFeeds } from './ingestion';

export const RSS_QUEUE_NAME = 'rss-ingestion-queue';

export const rssQueue = new Queue(RSS_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

/**
 * Enqueue a sync job for a specific company or all companies
 */
export async function enqueueSyncJob(companyId?: string) {
  if (companyId) {
    return await rssQueue.add('sync-single-feed', { companyId }, {
      jobId: `sync-${companyId}-${Date.now()}`,
    });
  } else {
    return await rssQueue.add('sync-all-feeds', {}, {
      jobId: `sync-all-${Date.now()}`,
    });
  }
}

/**
 * Initialize BullMQ Worker process
 */
export function createRssWorker() {
  const worker = new Worker(
    RSS_QUEUE_NAME,
    async (job: Job) => {
      console.log(`👷 BullMQ Worker processing job ${job.id} (${job.name})...`);

      if (job.name === 'sync-single-feed') {
        const { companyId } = job.data;
        return await syncCompanyFeed(companyId);
      } else if (job.name === 'sync-all-feeds') {
        return await syncAllFeeds();
      }
    },
    {
      connection: redis,
      concurrency: 3,
    }
  );

  worker.on('completed', (job, returnvalue) => {
    console.log(`🎉 Job ${job.id} completed!`, returnvalue);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed with error:`, err.message);
  });

  return worker;
}
