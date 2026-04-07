import { createHash } from 'crypto';
import * as cheerio from 'cheerio';

/**
 * Strips volatile presentation attributes from HTML so the checksum reflects
 * only structural/text changes, not style or class churn.
 */
function normalizeHtml(html: string): string {
  const $ = cheerio.load(html);

  $('style').remove();

  $('*').removeAttr('style').removeAttr('class');

  return $.html();
}

/**
 * Returns the SHA-256 hex digest of the normalized HTML content.
 * Styles and classes are stripped before hashing so only text/structure
 * changes trigger a mismatch.
 */
export function computeChecksum(content: string): string {
  return createHash('sha256').update(normalizeHtml(content), 'utf8').digest('hex');
}
