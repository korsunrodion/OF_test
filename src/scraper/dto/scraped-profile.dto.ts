export class ScrapedProfileDto {
  sourceUrl: string;
  username?: string | null;
  displayName?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  publicStats?: Record<string, unknown> | null;
  links?: string[] | null;
  rawHtml?: string | null;

  /** Set when the request was blocked (403, CF challenge, CAPTCHA) */
  blocked?: boolean;
  blockReason?: string;
}
