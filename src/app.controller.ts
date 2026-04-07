import { Controller, Get } from '@nestjs/common';
import { MetricsService } from './metrics/metrics.service';

@Controller()
export class AppController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('health')
  health(): { status: string; metrics: ReturnType<MetricsService['getSnapshot']> } {
    return { status: 'ok', metrics: this.metricsService.getSnapshot() };
  }
}
