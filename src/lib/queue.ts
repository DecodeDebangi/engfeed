import { FeedStatus } from '@prisma/client';
import { Queue, Worker, Job } from 'bullmq';
import { db } from './db';
import { redis } from './redis';
import { classifyPendingArticles } from './classifier';
import { recordFeedFailure, syncCompanyFeed } from './ingestion';

export const RSS_QUEUE_NAME = 'rss-ingestion-queue';

const FEED_SYNC_SCHEDULER_ID = 'sync-all-feeds-schedule';
const FEED_SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000;

export const CLASSIFY_QUEUE_NAME = 'article-classify-queue';

const CLASSIFY_SCHEDULER_ID = 'classify-articles-schedule';
const CLASSIFY_INTERVAL_MS = 10 * 60 * 1000;

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

export const classifyQueue = new Queue(CLASSIFY_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: { removeOnComplete: 20, removeOnFail: 20 },
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
 * Register the recurring full sync. Lives in Redis, so restarts and extra workers don't duplicate it.
 */
export async function scheduleFeedSync() {
  return await rssQueue.upsertJobScheduler(
    FEED_SYNC_SCHEDULER_ID,
    { every: FEED_SYNC_INTERVAL_MS },
    { name: 'sync-all-feeds' }
  );
}

/**
 * Register the recurring classification run, which picks up newly ingested articles
 */
export async function scheduleClassification() {
  return await classifyQueue.upsertJobScheduler(
    CLASSIFY_SCHEDULER_ID,
    { every: CLASSIFY_INTERVAL_MS },
    { name: 'classify-articles' }
  );
}

/**
 * Split a full sync into one job per feed, so feeds run concurrently and retry independently.
 * Job ids come from the parent's timestamp, so retrying the parent can't enqueue a feed twice.
 */
async function enqueueAllFeeds(job: Job) {
  const companies = await db.company.findMany({
    where: { feedStatus: { not: FeedStatus.RETIRED } },
    select: { id: true },
  });

  await rssQueue.addBulk(
    companies.map((company) => ({
      name: 'sync-single-feed',
      data: { companyId: company.id },
      opts: { jobId: `sync-${company.id}-${job.timestamp}` },
    }))
  );

  return { feedsEnqueued: companies.length };
}

/**
 * Sync one feed, counting a failed poll only once BullMQ has used up its retries
 */
async function processFeedJob(job: Job) {
  const { companyId } = job.data;

  try {
    return await syncCompanyFeed(companyId);
  } catch (err: any) {
    const isFinalAttempt = job.attemptsMade + 1 >= (job.opts.attempts ?? 1);
    if (isFinalAttempt) {
      await recordFeedFailure(companyId, err.message);
    }
    throw err;
  }
}

/**
 * Initialize BullMQ Worker process
 */
export function createRssWorker(queueName = RSS_QUEUE_NAME) {
  const worker = new Worker(
    queueName,
    async (job: Job) => {
      console.log(`👷 BullMQ Worker processing job ${job.id} (${job.name})...`);

      if (job.name === 'sync-single-feed') {
        return await processFeedJob(job);
      } else if (job.name === 'sync-all-feeds') {
        return await enqueueAllFeeds(job);
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

/**
 * Initialize the classification worker. Concurrency 1 stops overlapping runs from spending LLM quota twice.
 */
export function createClassifyWorker() {
  const worker = new Worker(CLASSIFY_QUEUE_NAME, async () => await classifyPendingArticles(), {
    connection: redis,
    concurrency: 1,
  });

  worker.on('completed', (job, returnvalue) => {
    console.log(`🧠 Classification run ${job.id} finished:`, returnvalue);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Classification run ${job?.id} failed with error:`, err.message);
  });

  return worker;
}
