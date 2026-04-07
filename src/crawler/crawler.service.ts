import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { Job, JobPriority, JobStatus } from '../database/entities/job.entity';
import { JobUrl, JobUrlStatus } from '../database/entities/job-url.entity';
import { CrawlRequestDto } from './dto/crawl-request.dto';
import { CRAWL_QUEUE, CRAWL_JOB } from '../queue/queue.constants';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(JobUrl)
    private readonly jobUrlRepo: Repository<JobUrl>,
    @InjectQueue(CRAWL_QUEUE)
    private readonly crawlQueue: Queue,
  ) {}

  async createJob(dto: CrawlRequestDto): Promise<{ jobId: string; queued: number }> {
    // Deduplicate URLs within the request
    const uniqueUrls = [...new Set(dto.urls)];

    const job = this.jobRepo.create({
      id: uuidv4(),
      status: JobStatus.QUEUED,
      priority: (dto.priority as JobPriority) ?? JobPriority.NORMAL,
      total: uniqueUrls.length,
    });
    await this.jobRepo.save(job);

    const jobUrls = uniqueUrls.map((url) =>
      this.jobUrlRepo.create({
        id: uuidv4(),
        jobId: job.id,
        url,
        status: JobUrlStatus.QUEUED,
      }),
    );
    await this.jobUrlRepo.save(jobUrls);

    // Enqueue one BullMQ task per URL
    await Promise.all(
      jobUrls.map((jobUrl) =>
        this.crawlQueue.add(
          CRAWL_JOB,
          { jobId: job.id, jobUrlId: jobUrl.id, url: jobUrl.url },
          {
            jobId: jobUrl.id,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
          },
        ),
      ),
    );

    this.logger.log({ jobId: job.id, queued: uniqueUrls.length }, 'Job created');

    return { jobId: job.id, queued: uniqueUrls.length };
  }
}
