import { JobStatus } from '../../database/entities/job.entity';

export class JobUrlResultDto {
  url: string;
  status: 'ok' | 'error';
  error: string | null;
}

export class JobStatusDto {
  jobId: string;
  status: JobStatus;
  total: number;
  processed: number;
  failed: number;
  results: JobUrlResultDto[];
}
