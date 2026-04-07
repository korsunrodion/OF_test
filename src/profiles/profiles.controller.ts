import { Controller, Get, Query } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { ProfileQueryDto } from './dto/profile-query.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  async search(@Query() query: ProfileQueryDto) {
    return this.profilesService.search(query);
  }
}
