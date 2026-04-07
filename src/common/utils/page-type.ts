const COMMON_PAGE_SEGMENTS = new Set([
  'about',
  'faq',
  'contact',
  'privacy',
  'terms',
  'help',
  'support',
  'legal',
  'cookies',
  'dmca',
  'guidelines',
  'careers',
  'press',
  'blog',
  'news',
]);

/**
 * Returns true if the URL points to a generic site page (about, faq, etc.)
 * rather than a user profile.
 */
export function isCommonPage(url: string): boolean {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return false;
  }

  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  return segments.some((s) => COMMON_PAGE_SEGMENTS.has(s));
}
