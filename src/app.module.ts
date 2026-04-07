import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { CrawlerModule } from './crawler/crawler.module';
import { JobsModule } from './jobs/jobs.module';
import { ProfilesModule } from './profiles/profiles.module';
import { QueueModule } from './queue/queue.module';
import { MetricsModule } from './metrics/metrics.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    QueueModule,
    CrawlerModule,
    JobsModule,
    ProfilesModule,
    MetricsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
