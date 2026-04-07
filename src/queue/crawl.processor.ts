import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job as BullJob } from 'bullmq';
import { JobUrl, JobUrlStatus } from '../database/entities/job-url.entity';
import { Job, JobStatus } from '../database/entities/job.entity';
import { Profile } from '../database/entities/profile.entity';
import { ScraperService } from '../scraper/scraper.service';
import { MetricsService } from '../metrics/metrics.service';
import { CRAWL_QUEUE } from './queue.constants';
import { computeChecksum } from '../common/utils/checksum';
import { extractChecksumElement } from '../scraper/parsers/onlyfans.parser';
import { isCommonPage } from '../common/utils/page-type';

export interface CrawlJobData {
  jobId: string;
  jobUrlId: string;
  url: string;
}

@Processor(CRAWL_QUEUE, { concurrency: 3 })
export class CrawlProcessor extends WorkerHost {
  private readonly logger = new Logger(CrawlProcessor.name);

  constructor(
    @InjectRepository(JobUrl)
    private readonly jobUrlRepo: Repository<JobUrl>,
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    private readonly scraperService: ScraperService,
    private readonly metricsService: MetricsService,
  ) {
    super();
  }

  async process(job: BullJob<CrawlJobData>): Promise<void> {
    const { jobId, jobUrlId, url } = job.data;

    await this.jobUrlRepo.update(jobUrlId, { status: JobUrlStatus.RUNNING });
    await this.updateJobStatus(jobId);

    // optimization TODO: separate fetching page and parsing, check checksum before parsing, as well as is common page
    try {
      const result = await this.scraperService.scrape(url);

      if (result.blocked) {
        await this.jobUrlRepo.update(jobUrlId, {
          status: JobUrlStatus.BLOCKED,
          error: result.blockReason ?? 'blocked',
        });
        this.metricsService.incrementBlocked();
        this.logger.warn({ url, reason: result.blockReason }, 'URL blocked');
        return;
      }

      // Checksum cache — skip parsing if page element hasn't changed
      const elementHtml = extractChecksumElement(result.rawHtml ?? '');
      const checksum = elementHtml ? computeChecksum(elementHtml) : null;

      const prevJobUrl = await this.jobUrlRepo.findOne({
        where: { url, status: JobUrlStatus.OK },
        order: { createdAt: 'DESC' },
      });

      if (prevJobUrl?.rawHtmlChecksum && checksum && prevJobUrl.rawHtmlChecksum === checksum) {
        this.logger.log({ url }, 'Checksum match — skipping parsing');
        await this.jobUrlRepo.update(jobUrlId, {
          status: JobUrlStatus.OK,
          profileId: prevJobUrl.profileId,
          rawHtmlChecksum: checksum,
        });
        this.metricsService.incrementScraped();
        return;
      }

      if (isCommonPage(url)) {
        await this.jobUrlRepo.update(jobUrlId, {
          status: JobUrlStatus.OK,
          pageHtml: result.rawHtml ?? null,
          rawHtmlChecksum: checksum,
        });
        this.logger.log({ url }, 'Common page saved');
        return;
      }

      const existing = await this.profileRepo.findOne({ where: { sourceUrl: url } });

      const profile = this.profileRepo.create({
        ...existing,
        sourceUrl: url,
        username: result.username ?? null,
        displayName: result.displayName ?? null,
        bio: result.bio ?? null,
        avatarUrl: result.avatarUrl ?? null,
        coverUrl: result.coverUrl ?? null,
        publicStats: result.publicStats ?? null,
        links: result.links ?? null,
        scrapedAt: new Date(),
      });
      const saved = await this.profileRepo.save(profile);

      await this.jobUrlRepo.update(jobUrlId, {
        status: JobUrlStatus.OK,
        profileId: saved.id,
        rawHtmlChecksum: checksum,
      });

      this.metricsService.incrementScraped();
      this.logger.log({ url, profileId: saved.id }, 'Profile saved');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error({ url, err: message }, 'Crawl failed');
      this.metricsService.incrementErrors();

      // Re-throw so BullMQ handles retries for 429/5xx
      throw err;
    } finally {
      await this.updateJobStatus(jobId);
    }
  }

  /** Recompute and persist top-level Job.status from its child JobUrl rows. */
  private async updateJobStatus(jobId: string): Promise<void> {
    const urls = await this.jobUrlRepo.find({ where: { jobId } });
    const total = urls.length;

    const hasRunning = urls.some(
      (u) => u.status === JobUrlStatus.QUEUED || u.status === JobUrlStatus.RUNNING,
    );
    if (hasRunning) {
      await this.jobRepo.update(jobId, { status: JobStatus.RUNNING });
      return;
    }

    const failed = urls.filter((u) => u.status === JobUrlStatus.ERROR).length;
    let status: JobStatus;
    if (failed === total) status = JobStatus.FAILED;
    else if (failed > 0) status = JobStatus.PARTIAL;
    else status = JobStatus.DONE;

    await this.jobRepo.update(jobId, { status });
  }
}
