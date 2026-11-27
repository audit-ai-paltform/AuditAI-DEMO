import { Job, Worker } from 'bullmq';
import { redisConnectionOptions } from '../core/config/redis.config.js';
import { reportsService } from '../modules/reports/reports.service.js';
import { reportQueue } from '../queues/call-pipeline.queue.js';

export const reportWorker = new Worker<{ report_id?: string }>('daily-reports', async (job: Job<{ report_id?: string }>) => {
  if (job.data.report_id) return reportsService.generate(job.data.report_id);
  const ids = await reportsService.queueCompletedBusinessDays();
  await Promise.all(ids.map((reportId) => reportQueue.add('generate-daily-report', { report_id: reportId }, { jobId: `report-${reportId}` })));
  return { queued: ids.length };
}, { connection: redisConnectionOptions, concurrency: 2 });
