import * as cheerio from 'cheerio';
import { ScrapedProfileDto } from '../dto/scraped-profile.dto';

/**
 * Parses raw HTML from an OnlyFans-like public profile page.
 * Every field is extracted null-safely — missing data becomes null, never throws.
 */
export function parseOnlyfansProfile(html: string, sourceUrl: string): ScrapedProfileDto {
  const $ = cheerio.load(html);

  const username = extractUsername($);
  const displayName = extractText($, '[data-testid="display-name"], .g-user-name');
  const bio = extractText($, '[data-testid="bio"], .b-user-info__text');
  const avatarUrl = extractAttr($, '.g-avatar__img-wrapper img', 'src');
  const coverUrl = extractAttr($, '.b-profile__header img', 'src');
  const publicStats = username ? extractStats($, username) : null;
  const links = extractLinks($);

  $('style').remove();
  $('*').removeAttr('style').removeAttr('class');

  return {
    sourceUrl,
    username,
    displayName,
    bio,
    avatarUrl,
    coverUrl,
    publicStats,
    links,
    rawHtml: $('body').html(),
  };
}

/**
 * Returns the outer HTML of the element used for change-detection checksums.
 * Adjust the selector once the real profile container is known.
 */
export function extractChecksumElement(html: string): string | null {
  const $ = cheerio.load(html);
  const el = $('body').first();
  if (!el.length) return null;
  return $.html(el);
}

function extractUsername($: cheerio.CheerioAPI): string | null {
  const username = $('.g-user-username').text().trim();
  return username || null;
}

function extractText($: cheerio.CheerioAPI, selector: string): string | null {
  const el = $(selector).first();
  if (!el.length) return null;
  const text = el.text().trim();
  return text || null;
}

function extractAttr($: cheerio.CheerioAPI, selector: string, attr: string): string | null {
  const el = $(selector).first();
  if (!el.length) return null;
  return el.attr(attr) ?? null;
}

function extractStats($: cheerio.CheerioAPI, username: string): Record<string, unknown> | null {
  const stats: Record<string, unknown> = {};

  const postsEl = $(`#profilePostTab`).first();
  if (postsEl.length) stats.posts = postsEl.text().trim();

  const mediaEl = $(`a[href="/${username.slice(1)}/media"]`).first();
  if (mediaEl.length) stats.media = mediaEl.text().trim();

  const likesEl = $('div.b-profile__sections__item .b-profile__sections__count').first();
  if (likesEl.length) stats.likes = likesEl.text().trim();

  return Object.keys(stats).length > 0 ? stats : null;
}

function extractLinks($: cheerio.CheerioAPI): string[] | null {
  const links: string[] = [];

  $('a[href^="/away"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    links.push(decodeURIComponent(href.slice(href.indexOf('?url=') + 5)));
  });

  return links.length > 0 ? links : null;
}
