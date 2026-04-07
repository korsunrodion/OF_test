export const configuration = () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  databaseUrl: process.env.DATABASE_URL ?? 'postgresql://crawler:crawler@localhost:5432/crawler',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  crawler: {
    timeoutMs: parseInt(process.env.CRAWLER_TIMEOUT_MS ?? '15000', 10),
    playwrightEnabled: process.env.PLAYWRIGHT_ENABLED !== 'false',
  },
  logLevel: process.env.LOG_LEVEL ?? 'info',
});

export type AppConfig = ReturnType<typeof configuration>;
