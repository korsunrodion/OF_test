import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { CrawlerService } from './crawler.service';
import { CrawlRequestDto } from './dto/crawl-request.dto';

@Controller('crawl')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Post()
  @HttpCode(202)
  async crawl(@Body() dto: CrawlRequestDto): Promise<{ jobId: string; queued: number }> {
    return this.crawlerService.createJob(dto);
  }
}
