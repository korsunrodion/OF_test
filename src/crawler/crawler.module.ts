import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { Job } from '../database/entities/job.entity';
import { JobUrl } from '../database/entities/job-url.entity';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [TypeOrmModule.forFeature([Job, JobUrl]), QueueModule],
  controllers: [CrawlerController],
  providers: [CrawlerService],
})
export class CrawlerModule {}
