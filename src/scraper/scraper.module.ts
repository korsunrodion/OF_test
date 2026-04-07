import { Module } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { HttpStrategy } from './strategies/http.strategy';
import { PlaywrightStrategy } from './strategies/playwright.strategy';

@Module({
  providers: [ScraperService, HttpStrategy, PlaywrightStrategy],
  exports: [ScraperService],
})
export class ScraperModule {}
