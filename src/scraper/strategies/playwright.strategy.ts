import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Browser } from 'playwright';
import { BlockedError, HttpFetchError } from './http.strategy';

@Injectable()
export class PlaywrightStrategy implements OnModuleDestroy {
  private readonly logger = new Logger(PlaywrightStrategy.name);
  private browser: Browser | null = null;

  constructor(private readonly config: ConfigService) {}

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      const { chromium } = await import('playwright');
      this.browser = await chromium.launch({ headless: true });
    }
    return this.browser;
  }

  async onModuleDestroy(): Promise<void> {
    if (this.browser?.isConnected()) {
      this.logger.log('Closing Playwright browser');
      await this.browser.close();
      this.browser = null;
    }
  }

  async fetch(url: string): Promise<string> {
    const timeout = this.config.get<number>('crawler.timeoutMs') ?? 15000;
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'en-US',
    });

    try {
      const page = await context.newPage();

      const response = await page.goto(url, { waitUntil: 'networkidle', timeout });
      const status = response?.status() ?? 0;

      if (status === 403) throw new BlockedError('playwright_403', `403 Forbidden on ${url}`);
      if (status === 429) throw new HttpFetchError(429, `429 Too Many Requests on ${url}`);

      const html = await page.content();

      if (this.hasCaptcha(html)) throw new BlockedError('captcha', `CAPTCHA detected on ${url}`);

      return html;
    } finally {
      await context.close();
    }
  }

  private hasCaptcha(html: string): boolean {
    return (
      html.includes('cf-challenge') || html.includes('g-recaptcha') || html.includes('hcaptcha')
    );
  }
}
