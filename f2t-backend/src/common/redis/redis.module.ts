import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

const logger = new Logger('RedisModule');

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        const client = new Redis(url, { lazyConnect: true, enableOfflineQueue: false });
        client.on('error', (err: Error) => { logger.warn(`Redis error: ${err.message}`); });
        void client.connect().catch(() => {
          logger.warn('Redis unavailable — demand forecast caching disabled');
        });
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
