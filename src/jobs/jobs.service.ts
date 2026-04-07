import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus } from '../database/entities/job.entity';
import { JobUrl, JobUrlStatus } from '../database/entities/job-url.entity';
import { JobStatusDto, JobUrlResultDto } from './dto/job-status.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    @InjectRepository(JobUrl)
    private readonly jobUrlRepo: Repository<JobUrl>,
  ) {}

  async getJobStatus(jobId: string): Promise<JobStatusDto | null> {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) return null;

    const urls = await this.jobUrlRepo.find({ where: { jobId } });

    const processed = urls.filter(
      (u) => u.status === JobUrlStatus.OK || u.status === JobUrlStatus.BLOCKED,
    ).length;
    const failed = urls.filter((u) => u.status === JobUrlStatus.ERROR).length;

    const status = this.deriveStatus(urls, job.total);

    const results: JobUrlResultDto[] = urls.map((u) => ({
      url: u.url,
      status: u.status === JobUrlStatus.OK ? 'ok' : 'error',
      error: u.error ?? null,
    }));

    return {
      jobId: job.id,
      status,
      total: job.total,
      processed,
      failed,
      results,
    };
  }

  private deriveStatus(urls: JobUrl[], total: number): JobStatus {
    const hasRunning = urls.some(
      (u) => u.status === JobUrlStatus.QUEUED || u.status === JobUrlStatus.RUNNING,
    );
    if (hasRunning) return JobStatus.RUNNING;

    const failed = urls.filter((u) => u.status === JobUrlStatus.ERROR).length;
    if (failed === total) return JobStatus.FAILED;
    if (failed > 0) return JobStatus.PARTIAL;
    return JobStatus.DONE;
  }
}
