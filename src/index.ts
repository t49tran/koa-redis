import { createClient, RedisClient } from 'redis';
import { createPool } from 'generic-pool';
import { Context, Next } from 'koa';

const debug = require('debug')('redis');

declare global {
  namespace Koa {
    interface Context {
      redisClient?: RedisClient;
    }
  }
}

const defaultOptions = {
  host: '127.0.0.1',
  port: 6379,
  maxConnections: 10,
  minConnections: 2,
  createAttempts: 3,
  debug: process.env.NODE_ENV === 'development'
};

type RedisOptions = {
  host: string;
  port: number;
  maxConnections?: number;
  minConnections?: number;
  createAttempts?: number;
  debug?: boolean;
};

const koaRedisMiddleware = function (redisOptions: RedisOptions) {
  const options = { ...defaultOptions, ...redisOptions };
  let redisRetries = 0;

  const redisPool = createPool<RedisClient>(
    {
      create: () => {
        return new Promise(function (resolve, reject) {
          let client = createClient(options);
          client.on('error', () => {
            debug('Error connecting to redis server');
            redisRetries++;
            const { createAttempts } = options;

            if (redisRetries > createAttempts) {
              reject(
                `Could not connect to redis server, max attempts reached: ${createAttempts}`
              );
            }
          });
          client.on('ready', () => {
            resolve(client);
          });
        });
      },
      destroy: (client: RedisClient) => {
        return new Promise((resolve, reject) => {
          client.quit(error => {
            if (error) {
              return reject(error);
            }

            resolve();
          });
        });
      }
    },
    { min: options.minConnections, max: options.maxConnections }
  );

  return function koaRedis(ctx: Context, next: Next) {
    const { maxConnections, minConnections } = options;
    const handleAcquireConnection = async (redisClient: RedisClient) => {
      ctx.redisClient = redisClient;

      return next();
    };

    const handleReleaseConnection = (error?: Error) => {
      if (ctx.redisClient) {
        redisPool.release(ctx.redisClient);

        debug(
          'Release one redis connection (min: %s, max: %s, poolSize: %s)',
          minConnections,
          maxConnections,
          redisPool.size
        );
      }

      if (error && error.message && error.stack) {
        throw error;
      }
    };

    return redisPool
      .acquire()
      .then(handleAcquireConnection, handleReleaseConnection)
      .then(handleReleaseConnection, handleReleaseConnection);
  };
};

export default koaRedisMiddleware;
