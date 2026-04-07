import { DataSource } from 'typeorm';
import { Job } from './entities/job.entity';
import { JobUrl } from './entities/job-url.entity';
import { Profile } from './entities/profile.entity';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://crawler:crawler@localhost:5432/crawler',
  entities: [Job, JobUrl, Profile],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: false,
});
