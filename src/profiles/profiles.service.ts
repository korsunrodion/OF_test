import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { Profile } from '../database/entities/profile.entity';
import { ProfileQueryDto } from './dto/profile-query.dto';

@Injectable()
export class ProfilesService {
  constructor(
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {}

  async search(query: ProfileQueryDto): Promise<{
    total: number;
    page: number;
    limit: number;
    data: Profile[];
  }> {
    const { query: q = '', page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const pattern = `%${q}%`;

    const [data, total] = await this.profileRepo.findAndCount({
      where: q
        ? [{ username: ILike(pattern) }, { displayName: ILike(pattern) }, { bio: ILike(pattern) }]
        : {},
      skip,
      take: limit,
      order: { scrapedAt: 'DESC' },
    });

    return { total, page, limit, data };
  }
}
