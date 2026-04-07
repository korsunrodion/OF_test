import * as fs from 'fs';
import * as path from 'path';
import {
  parseOnlyfansProfile,
  extractChecksumElement,
} from '../../src/scraper/parsers/onlyfans.parser';

const fixtureHtml = fs.readFileSync(
  path.join(__dirname, '../fixtures/onlyfans-profile.html'),
  'utf8',
);

const SOURCE_URL = 'https://onlyfans.com/testuser';

describe('parseOnlyfansProfile', () => {
  it('extracts username from .g-user-username', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(result.username).toBe('@testuser');
  });

  it('extracts display name from [data-testid="display-name"]', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(result.displayName).toBe('Test User');
  });

  it('extracts bio from [data-testid="bio"]', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(result.bio).toBe('This is a sample bio for testing.');
  });

  it('extracts avatar URL from .g-avatar__img-wrapper img', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(result.avatarUrl).toBe('https://cdn.example.com/avatar/testuser.jpg');
  });

  it('extracts cover URL from .b-profile__header img', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(result.coverUrl).toBe('https://cdn.example.com/cover/testuser.jpg');
  });

  it('extracts post count from #profilePostTab', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(result.publicStats?.posts).toBe('42');
  });

  it('extracts media count from a[href="/{username}/media"]', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(result.publicStats?.media).toBe('100');
  });

  it('extracts likes from .b-profile__sections__item .b-profile__sections__count', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(result.publicStats?.likes).toBe('1.2K');
  });

  it('decodes and extracts external links from /away hrefs', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(result.links).toContain('https://twitter.com/testuser');
    expect(result.links).toContain('https://instagram.com/testuser');
  });

  it('passes sourceUrl through to the dto', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(result.sourceUrl).toBe(SOURCE_URL);
  });

  it('sets rawHtml to a non-empty string containing page content', () => {
    const result = parseOnlyfansProfile(fixtureHtml, SOURCE_URL);
    expect(typeof result.rawHtml).toBe('string');
    expect(result.rawHtml?.length).toBeGreaterThan(0);
    expect(result.rawHtml).toContain('@testuser');
  });

  it('returns null for all optional fields on empty HTML', () => {
    const result = parseOnlyfansProfile('<html><body></body></html>', SOURCE_URL);
    expect(result.username).toBeNull();
    expect(result.displayName).toBeNull();
    expect(result.bio).toBeNull();
    expect(result.avatarUrl).toBeNull();
    expect(result.coverUrl).toBeNull();
    expect(result.publicStats).toBeNull();
    expect(result.links).toBeNull();
  });

  it('returns null publicStats when username is absent', () => {
    const html = '<html><body><span data-testid="display-name">No Username</span></body></html>';
    const result = parseOnlyfansProfile(html, SOURCE_URL);
    expect(result.publicStats).toBeNull();
  });
});

describe('extractChecksumElement', () => {
  it('returns a string for valid HTML', () => {
    const result = extractChecksumElement('<html><body><p>hello</p></body></html>');
    expect(typeof result).toBe('string');
    expect(result).toContain('hello');
  });

  it('returns the body element HTML', () => {
    const result = extractChecksumElement('<html><body><p>content</p></body></html>');
    expect(result).toContain('<body>');
    expect(result).toContain('</body>');
  });

  it('returns non-null for empty body', () => {
    const result = extractChecksumElement('<html><body></body></html>');
    expect(result).not.toBeNull();
  });
});
