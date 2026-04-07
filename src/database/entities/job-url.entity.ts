import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Job } from './job.entity';

export enum JobUrlStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  OK = 'ok',
  ERROR = 'error',
  BLOCKED = 'blocked',
}

@Entity('job_urls')
export class JobUrl {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @ManyToOne(() => Job, (job) => job.urls, { onDelete: 'CASCADE' })
  job: Job;

  @Column()
  url: string;

  @Column({ type: 'enum', enum: JobUrlStatus, default: JobUrlStatus.QUEUED })
  status: JobUrlStatus;

  @Column({ type: 'text', nullable: true })
  error: string | null;

  @Column({ type: 'uuid', nullable: true })
  profileId: string | null;

  @Column({ type: 'varchar', nullable: true })
  rawHtmlChecksum: string | null;

  @Column({ type: 'text', nullable: true })
  pageHtml: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
