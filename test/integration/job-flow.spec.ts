import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { CrawlerService } from '../../src/crawler/crawler.service';
import { JobsService } from '../../src/jobs/jobs.service';
import { Job, JobStatus, JobPriority } from '../../src/database/entities/job.entity';
import { JobUrl, JobUrlStatus } from '../../src/database/entities/job-url.entity';
import { CRAWL_QUEUE } from '../../src/queue/queue.constants';

const makeJobRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
});

const makeJobUrlRepo = () => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
});

const makeQueue = () => ({
  add: jest.fn().mockResolvedValue({}),
});

describe('CrawlerService', () => {
  let crawlerService: CrawlerService;
  let jobRepo: ReturnType<typeof makeJobRepo>;
  let jobUrlRepo: ReturnType<typeof makeJobUrlRepo>;
  let queue: ReturnType<typeof makeQueue>;

  beforeEach(async () => {
    jobRepo = makeJobRepo();
    jobUrlRepo = makeJobUrlRepo();
    queue = makeQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrawlerService,
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: getRepositoryToken(JobUrl), useValue: jobUrlRepo },
        { provide: getQueueToken(CRAWL_QUEUE), useValue: queue },
      ],
    }).compile();

    crawlerService = module.get(CrawlerService);
  });

  it('creates a job and returns jobId and queued count', async () => {
    const savedJob = {
      id: 'job-1',
      status: JobStatus.QUEUED,
      priority: JobPriority.NORMAL,
      total: 2,
    };
    jobRepo.create.mockReturnValue(savedJob);
    jobRepo.save.mockResolvedValue(savedJob);
    jobUrlRepo.create.mockImplementation((data) => data);
    jobUrlRepo.save.mockResolvedValue([]);

    const result = await crawlerService.createJob({
      urls: ['https://example.com/a', 'https://example.com/b'],
    });

    expect(result.jobId).toBe('job-1');
    expect(result.queued).toBe(2);
  });

  it('deduplicates URLs within a single request', async () => {
    const savedJob = {
      id: 'job-2',
      status: JobStatus.QUEUED,
      priority: JobPriority.NORMAL,
      total: 1,
    };
    jobRepo.create.mockReturnValue(savedJob);
    jobRepo.save.mockResolvedValue(savedJob);
    jobUrlRepo.create.mockImplementation((data) => data);
    jobUrlRepo.save.mockResolvedValue([]);

    const result = await crawlerService.createJob({
      urls: ['https://example.com/dup', 'https://example.com/dup'],
    });

    expect(result.queued).toBe(1);
    expect(jobUrlRepo.create).toHaveBeenCalledTimes(1);
  });

  it('enqueues one BullMQ job per unique URL', async () => {
    const savedJob = {
      id: 'job-3',
      status: JobStatus.QUEUED,
      priority: JobPriority.NORMAL,
      total: 3,
    };
    jobRepo.create.mockReturnValue(savedJob);
    jobRepo.save.mockResolvedValue(savedJob);
    jobUrlRepo.create.mockImplementation((data) => data);
    jobUrlRepo.save.mockResolvedValue([]);

    await crawlerService.createJob({
      urls: ['https://a.com/1', 'https://a.com/2', 'https://a.com/3'],
    });

    expect(queue.add).toHaveBeenCalledTimes(3);
  });

  it('enqueues jobs with only jobId option (retries configured at queue level)', async () => {
    const savedJob = {
      id: 'job-4',
      status: JobStatus.QUEUED,
      priority: JobPriority.NORMAL,
      total: 1,
    };
    jobRepo.create.mockReturnValue(savedJob);
    jobRepo.save.mockResolvedValue(savedJob);
    jobUrlRepo.create.mockImplementation((data) => data);
    jobUrlRepo.save.mockResolvedValue([]);

    await crawlerService.createJob({ urls: ['https://example.com/u'] });

    const [, , options] = queue.add.mock.calls[0];
    expect(options).toEqual({ jobId: expect.any(String) });
  });

  it('uses NORMAL priority by default', async () => {
    const savedJob = {
      id: 'job-5',
      status: JobStatus.QUEUED,
      priority: JobPriority.NORMAL,
      total: 1,
    };
    jobRepo.create.mockReturnValue(savedJob);
    jobRepo.save.mockResolvedValue(savedJob);
    jobUrlRepo.create.mockImplementation((data) => data);
    jobUrlRepo.save.mockResolvedValue([]);

    await crawlerService.createJob({ urls: ['https://example.com/u'] });

    expect(jobRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ priority: JobPriority.NORMAL }),
    );
  });
});

describe('JobsService', () => {
  let jobsService: JobsService;
  let jobRepo: ReturnType<typeof makeJobRepo>;
  let jobUrlRepo: ReturnType<typeof makeJobUrlRepo>;

  beforeEach(async () => {
    jobRepo = makeJobRepo();
    jobUrlRepo = makeJobUrlRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobsService,
        { provide: getRepositoryToken(Job), useValue: jobRepo },
        { provide: getRepositoryToken(JobUrl), useValue: jobUrlRepo },
      ],
    }).compile();

    jobsService = module.get(JobsService);
  });

  it('returns null for a non-existent job', async () => {
    jobRepo.findOne.mockResolvedValue(null);
    expect(await jobsService.getJobStatus('missing')).toBeNull();
  });

  it('returns DONE when all URLs are OK', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'j1', total: 2 });
    jobUrlRepo.find.mockResolvedValue([
      { url: 'https://a.com', status: JobUrlStatus.OK, error: null },
      { url: 'https://b.com', status: JobUrlStatus.OK, error: null },
    ]);

    const status = await jobsService.getJobStatus('j1');
    expect(status?.status).toBe(JobStatus.DONE);
    expect(status?.processed).toBe(2);
    expect(status?.failed).toBe(0);
  });

  it('counts BLOCKED URLs as processed, not failed', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'j2', total: 2 });
    jobUrlRepo.find.mockResolvedValue([
      { url: 'https://a.com', status: JobUrlStatus.OK, error: null },
      { url: 'https://b.com', status: JobUrlStatus.BLOCKED, error: 'cf-block' },
    ]);

    const status = await jobsService.getJobStatus('j2');
    expect(status?.processed).toBe(2);
    expect(status?.failed).toBe(0);
  });

  it('returns PARTIAL when some URLs errored', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'j3', total: 2 });
    jobUrlRepo.find.mockResolvedValue([
      { url: 'https://a.com', status: JobUrlStatus.OK, error: null },
      { url: 'https://b.com', status: JobUrlStatus.ERROR, error: 'timeout' },
    ]);

    const status = await jobsService.getJobStatus('j3');
    expect(status?.status).toBe(JobStatus.PARTIAL);
    expect(status?.failed).toBe(1);
  });

  it('returns FAILED when all URLs errored', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'j4', total: 2 });
    jobUrlRepo.find.mockResolvedValue([
      { url: 'https://a.com', status: JobUrlStatus.ERROR, error: 'err' },
      { url: 'https://b.com', status: JobUrlStatus.ERROR, error: 'err' },
    ]);

    const status = await jobsService.getJobStatus('j4');
    expect(status?.status).toBe(JobStatus.FAILED);
  });

  it('returns RUNNING when URLs are still queued', async () => {
    jobRepo.findOne.mockResolvedValue({ id: 'j5', total: 2 });
    jobUrlRepo.find.mockResolvedValue([
      { url: 'https://a.com', status: JobUrlStatus.OK, error: null },
      { url: 'https://b.com', status: JobUrlStatus.QUEUED, error: null },
    ]);

    const status = await jobsService.getJobStatus('j5');
    expect(status?.status).toBe(JobStatus.RUNNING);
  });
});
