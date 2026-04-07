import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export class HttpFetchError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpFetchError';
  }
}

export class BlockedError extends Error {
  constructor(
    public readonly reason: string,
    message: string,
  ) {
    super(message);
    this.name = 'BlockedError';
  }
}

@Injectable()
export class HttpStrategy {
  private readonly logger = new Logger(HttpStrategy.name);

  private readonly headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    Connection: 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };

  constructor(private readonly config: ConfigService) {}

  async fetch(url: string): Promise<string> {
    const timeout = this.config.get<number>('crawler.timeoutMs') ?? 15000;

    try {
      const response = await axios.get<string>(url, {
        headers: this.headers,
        timeout,
        maxRedirects: 5,
        responseType: 'text',
        validateStatus: (status) => status < 500,
      });

      if (response.status === 403) {
        throw new BlockedError('http_403', `403 Forbidden on ${url}`);
      }

      if (response.status === 429) {
        throw new HttpFetchError(429, `429 Too Many Requests on ${url}`);
      }

      if (response.status === 404) {
        throw new HttpFetchError(404, `404 Not Found on ${url}`);
      }

      if (this.isCloudflarePage(response.data)) {
        throw new BlockedError('cloudflare', `Cloudflare challenge detected on ${url}`);
      }

      return response.data;
    } catch (err) {
      if (err instanceof BlockedError || err instanceof HttpFetchError) throw err;

      const axiosErr = err as AxiosError;
      if (axiosErr.code === 'ECONNABORTED') {
        throw new HttpFetchError(408, `Timeout fetching ${url}`);
      }

      this.logger.error({ url, err: axiosErr.message }, 'HTTP fetch error');
      throw new HttpFetchError(0, `Network error: ${axiosErr.message}`);
    }
  }

  private isCloudflarePage(html: string): boolean {
    return (
      html.includes('cf-browser-verification') ||
      html.includes('Checking your browser') ||
      html.includes('cf_chl_')
    );
  }
}
