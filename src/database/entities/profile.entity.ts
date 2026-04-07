import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('profiles')
export class Profile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column()
  sourceUrl: string;

  @Column({ type: 'varchar', nullable: true })
  username: string | null;

  @Column({ type: 'varchar', nullable: true })
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  coverUrl: string | null;

  @Column({ type: 'jsonb', nullable: true })
  publicStats: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  links: string[] | null;

  @Column({ type: 'timestamptz', nullable: true })
  scrapedAt: Date | null;

  @UpdateDateColumn()
  updatedAt: Date;
}
