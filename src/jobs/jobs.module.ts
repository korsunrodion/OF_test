import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Job } from '../database/entities/job.entity';
import { JobUrl } from '../database/entities/job-url.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Job, JobUrl])],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
