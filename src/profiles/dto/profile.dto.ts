export class ProfileDto {
  id: string;
  sourceUrl: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  publicStats: Record<string, unknown> | null;
  links: string[] | null;
  rawHtmlChecksum: string | null;
  scrapedAt: Date | null;
}
