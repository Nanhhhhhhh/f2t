import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const logger = new Logger('RedisModule');

let lastErrorLogTime = 0;
const ERROR_LOG_INTERVAL = 15 * 60 * 1000; // 15 minutes

const throttledWarn = (message: string) => {
  const now = Date.now();
  if (now - lastErrorLogTime > ERROR_LOG_INTERVAL) {
    logger.warn(message);
    lastErrorLogTime = now;
  }
};

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const client = new Redis(url, {
          lazyConnect: true,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 0,
        });

        client.on('error', (err: Error) => {
          throttledWarn(`Redis error: ${err.message}`);
        });

        void client.connect().catch(() => {
          throttledWarn('Redis unavailable — demand forecast caching disabled');
        });
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
