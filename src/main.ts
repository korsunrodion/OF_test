import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`Application listening on port ${port}`);

  const shutdown = async (signal: string) => {
    logger.log(`${signal} received — shutting down gracefully`);
    const TIMEOUT_MS = 30_000;
    await Promise.race([
      app.close(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Shutdown timeout exceeded')), TIMEOUT_MS),
      ),
    ]).catch((err: Error) => logger.error(`Forced shutdown: ${err.message}`));
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

void bootstrap();
