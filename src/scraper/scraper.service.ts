import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpStrategy, BlockedError, HttpFetchError } from './strategies/http.strategy';
import { PlaywrightStrategy } from './strategies/playwright.strategy';
import { parseOnlyfansProfile } from './parsers/onlyfans.parser';
import { ScrapedProfileDto } from './dto/scraped-profile.dto';

/**
 * Orchestrates the scraping ladder:
 *  1. HTTP + Cheerio (fast, cheap)
 *  2. Playwright (if HTTP got a JS-shell or empty parse)
 *  3. blocked (if 403/CF/CAPTCHA at any stage)
 */
@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  constructor(
    private readonly httpStrategy: HttpStrategy,
    private readonly playwrightStrategy: PlaywrightStrategy,
    private readonly config: ConfigService,
  ) {}

  async scrape(url: string): Promise<ScrapedProfileDto> {
    // Stage 1 — HTTP
    let html: string | null = null;

    try {
      html = await this.httpStrategy.fetch(url);
    } catch (err) {
      if (err instanceof BlockedError) {
        return { sourceUrl: url, blocked: true, blockReason: err.reason };
      }
      if (err instanceof HttpFetchError && err.statusCode !== 404) {
        // 429 / timeout — re-throw so BullMQ can retry with backoff
        throw err;
      }
    }

    // Stage 2 — Playwright fallback
    if (!html || this.isJsShell(html)) {
      const playwrightEnabled = this.config.get<boolean>('crawler.playwrightEnabled');
      if (!playwrightEnabled) {
        this.logger.warn({ url }, 'Playwright disabled, marking as empty');
        return parseOnlyfansProfile(html ?? '', url);
      }

      try {
        html = await this.playwrightStrategy.fetch(url);
      } catch (err) {
        if (err instanceof BlockedError) {
          return { sourceUrl: url, blocked: true, blockReason: err.reason };
        }
        throw err;
      }
    }

    return parseOnlyfansProfile(html, url);
  }

  /** Detect pages that are JS shells with no server-rendered content. */
  private isJsShell(html: string): boolean {
    return html.includes("We'll try your destination again in 15 seconds");
  }
}
