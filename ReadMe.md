## koa-redis

koa-redis is a redis middleware for koa@2, inspired by koa-mongo middleware https://github.com/nswbmw/koa-mongo. It's written in Typescript and support koa2 async / await syntax.

It provides a promisified wrapper for [node-redis](https://github.com/NodeRedis/node-redis) client using bluebird.

### Usage

```
import koaRedis from 'dt-koa-redis';

app.use(koaRedis({
  host: '127.0.0.1',
  port: 6379,
  maxConnections: 100,
  minConnections: 1,
}));

app.use(async (ctx, next) => {
  try {

    const data = await ctx.redis.getAsync('test');
    const write = 'testing';

    await ctx.redis.setAsync('test_key',write);
  } catch(err) {
    debug(err);
  }
});
```

### License

MIT
