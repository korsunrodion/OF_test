import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module';

/**
 * E2E test: POST /crawl → GET /jobs/:id
 *
 * Requires a running PostgreSQL + Redis instance (see docker-compose.yml).
 * Set TEST_DATABASE_URL and TEST_REDIS_URL env vars, or use the defaults
 * from docker-compose for local runs.
 */
describe('Crawler E2E', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /crawl returns jobId and queued count', async () => {
    const res = await request(app.getHttpServer() as Server)
      .post('/crawl')
      .send({ urls: ['https://example.com/profile1'], priority: 'normal' })
      .expect(202);

    expect(res.body.jobId).toBeDefined();
    expect(res.body.queued).toBe(1);
  });

  it('GET /jobs/:jobId returns job status', async () => {
    // Create a job first
    const crawlRes = await request(app.getHttpServer() as Server)
      .post('/crawl')
      .send({ urls: ['https://example.com/profile2'] })
      .expect(202);

    const { jobId } = crawlRes.body as { jobId: string };

    const jobRes = await request(app.getHttpServer() as Server)
      .get(`/jobs/${jobId}`)
      .expect(200);

    expect(jobRes.body.jobId).toBe(jobId);
    expect(['queued', 'running', 'done', 'failed', 'partial']).toContain(jobRes.body.status);
    expect(typeof jobRes.body.total).toBe('number');
    expect(Array.isArray(jobRes.body.results)).toBe(true);
  });

  it('GET /jobs/:jobId returns 404 for unknown job', async () => {
    await request(app.getHttpServer() as Server)
      .get('/jobs/00000000-0000-0000-0000-000000000000')
      .expect(404);
  });

  it('POST /crawl deduplicates URLs in the same request', async () => {
    const res = await request(app.getHttpServer() as Server)
      .post('/crawl')
      .send({
        urls: ['https://example.com/same', 'https://example.com/same'],
      })
      .expect(202);

    expect(res.body.queued).toBe(1);
  });

  it('GET /profiles returns paginated results', async () => {
    const res = await request(app.getHttpServer() as Server)
      .get('/profiles?page=1&limit=10')
      .expect(200);

    expect(typeof res.body.total).toBe('number');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.page).toBe(1);
    expect(res.body.limit).toBe(10);
  });
});
