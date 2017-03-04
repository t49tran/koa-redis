## koa-redis

koa-redis is a mongodb middleware for koa@2, using redis and bluebird, support connection pool, inspired by koa-mongo middleware https://github.com/nswbmw/koa-mongo

### Usage

```
app.use(redis({
  host: '127.0.0.1',
  port: 6379,
  max: 100,
  min: 1,
}));
```

defaultOptions:

```
{
  host: '127.0.0.1',
  port: 6379,
  max: 100,
  min: 1,
}
```

More options see [generic-pool](https://github.com/coopernurse/node-pool).

### Example

```
'use strict';

const koa = require('koa');
const redis = require('koa-redis');

const app = new koa();

app.use(redis());
app.use(async (ctx, next) => {
  try {

    const data = await ctx.redis.getAsync('test');
    const write = 'testing';

    await ctx.redis.setAsync('test_key',write);
  } catch(err) {
    debug(err);
  }
});
app.listen(3000, () => {
  console.log('listening on port 3000');
});
```

### License

MIT