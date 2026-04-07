import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobStatusDto } from './dto/job-status.dto';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get(':jobId')
  async getJob(@Param('jobId') jobId: string): Promise<JobStatusDto> {
    const job = await this.jobsService.getJobStatus(jobId);
    if (!job) throw new NotFoundException(`Job ${jobId} not found`);
    return job;
  }
}
