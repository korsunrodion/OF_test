import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CRAWL_QUEUE } from './queue.constants';
import { CrawlProcessor } from './crawl.processor';
import { ScraperModule } from '../scraper/scraper.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobUrl } from '../database/entities/job-url.entity';
import { Job } from '../database/entities/job.entity';
import { Profile } from '../database/entities/profile.entity';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('redisUrl') },
      }),
    }),
    BullModule.registerQueueAsync({
      name: CRAWL_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 4000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
    TypeOrmModule.forFeature([Job, JobUrl, Profile]),
    ScraperModule,
    MetricsModule,
  ],
  providers: [CrawlProcessor],
  exports: [BullModule],
})
export class QueueModule {}
