import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Job } from './entities/job.entity';
import { JobUrl } from './entities/job-url.entity';
import { Profile } from './entities/profile.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('databaseUrl'),
        entities: [Job, JobUrl, Profile],
        migrations: ['dist/database/migrations/*.js'],
        migrationsRun: true,
        synchronize: false,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
