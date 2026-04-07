import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { MetricsService } from './metrics/metrics.service';

describe('AppController', () => {
  let appController: AppController;
  let metricsService: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [MetricsService],
    }).compile();

    appController = module.get(AppController);
    metricsService = module.get(MetricsService);
  });

  describe('GET /health', () => {
    it('returns status ok', () => {
      const result = appController.health();
      expect(result.status).toBe('ok');
    });

    it('returns zero metrics on startup', () => {
      const result = appController.health();
      expect(result.metrics).toEqual({ scraped: 0, blocked: 0, errors: 0 });
    });

    it('reflects incremented metrics', () => {
      metricsService.incrementScraped();
      metricsService.incrementScraped();
      metricsService.incrementBlocked();
      metricsService.incrementErrors();

      const result = appController.health();
      expect(result.metrics).toEqual({ scraped: 2, blocked: 1, errors: 1 });
    });
  });
});
