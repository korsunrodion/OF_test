import { isCommonPage } from '../../src/common/utils/page-type';

describe('isCommonPage', () => {
  it.each([
    ['about', 'https://example.com/about'],
    ['faq', 'https://example.com/faq'],
    ['contact', 'https://example.com/contact'],
    ['privacy', 'https://example.com/privacy'],
    ['terms', 'https://example.com/terms'],
    ['help', 'https://example.com/help'],
    ['support', 'https://example.com/support'],
    ['legal', 'https://example.com/legal'],
    ['cookies', 'https://example.com/cookies'],
    ['dmca', 'https://example.com/dmca'],
    ['careers', 'https://example.com/careers'],
    ['press', 'https://example.com/press'],
    ['blog', 'https://example.com/blog'],
    ['news', 'https://example.com/news'],
    ['nested segment', 'https://example.com/en/about'],
    ['case insensitive', 'https://example.com/FAQ'],
  ])('returns true for %s page (%s)', (_, url) => {
    expect(isCommonPage(url)).toBe(true);
  });

  it.each([
    ['user profile', 'https://onlyfans.com/johnsmith'],
    ['profile with path', 'https://example.com/username/posts'],
    ['root path', 'https://example.com/'],
    ['no path', 'https://example.com'],
    ['invalid URL', 'not-a-url'],
  ])('returns false for %s (%s)', (_, url) => {
    expect(isCommonPage(url)).toBe(false);
  });
});
