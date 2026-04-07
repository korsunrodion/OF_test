import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { JobUrl } from './job-url.entity';

export enum JobStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  DONE = 'done',
  FAILED = 'failed',
  PARTIAL = 'partial',
}

export enum JobPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
}

@Entity('jobs')
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: JobStatus, default: JobStatus.QUEUED })
  status: JobStatus;

  @Column({ type: 'enum', enum: JobPriority, default: JobPriority.NORMAL })
  priority: JobPriority;

  @Column({ type: 'int', default: 0 })
  total: number;

  @OneToMany(() => JobUrl, (jobUrl) => jobUrl.job, { cascade: true })
  urls: JobUrl[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
