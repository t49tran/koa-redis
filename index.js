/**
 * TODO: separate the redis implementation from the cache middleware
 */
// Koa redis middleware using generic pool
import _ from 'lodash';
import Redis from 'redis';
import Promise from 'bluebird';
import genericPool from 'generic-pool';

Promise.promisifyAll(Redis.RedisClient.prototype);
Promise.promisifyAll(Redis.Multi.prototype);

var debug = require('debug')('redis');

const default_options = {
  host: '127.0.0.1',
  port: 6379,
  max: 10,
  min: 2,
  create_attempts: 3
};

const redis = function (redis_options) {
  redis_options = _.assign({}, default_options, redis_options);
  let redis_retries = 0;
  const redisPool = genericPool.createPool({
    create: () => {
      return new Promise(function (resolve, reject) {
        let client = Redis.createClient(redis_options);
        client.on('error', () => {
          debug('Error connecting to redis server');
          redis_retries++;
          if (redis_retries > redis_options.create_attempts) {
            resolve();
          }
        });
        client.on('ready', () => {
          resolve(client);
        });
      });
    },
    destroy: client => client.quit(),
  }, redis_options);

  return function koaRedis(ctx, next) {
    return redisPool.acquire()
      .then(redisClient => {
        ctx.redisClient = redisClient;
        debug('Acquire one redis connection (min: %s, max: %s, poolSize: %s)', redis_options.min, redis_options.max, redisPool.size);
        return next();
      })
      .then(() => {
        redisPool.release(ctx.redisClient);
        debug('Release one redis connection (min: %s, max: %s, poolSize: %s)', redis_options.min, redis_options.max, redisPool.size);
      })
      .catch(e => {

        if (ctx.redisClient) {
          redisPool.release(ctx.redisClient);
          debug('Release one redis connection (min: %s, max: %s, poolSize: %s)', redis_options.min, redis_options.max, redisPool.size);
        }
        throw e;
      });
  };
};

export default redis;