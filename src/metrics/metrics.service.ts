import { Injectable } from '@nestjs/common';

export interface MetricsSnapshot {
  scraped: number;
  blocked: number;
  errors: number;
}

@Injectable()
export class MetricsService {
  private scraped = 0;
  private blocked = 0;
  private errors = 0;

  incrementScraped(): void {
    this.scraped++;
  }

  incrementBlocked(): void {
    this.blocked++;
  }

  incrementErrors(): void {
    this.errors++;
  }

  getSnapshot(): MetricsSnapshot {
    return {
      scraped: this.scraped,
      blocked: this.blocked,
      errors: this.errors,
    };
  }
}
