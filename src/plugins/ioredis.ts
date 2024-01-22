import { FastifyPluginCallback } from 'fastify';
import fp from 'fastify-plugin';
import defaultClientRedis from '../utils/defaultClient.redis.js';

type IORedisFastify = FastifyPluginCallback<ioredisFastify.IORedisFastifyOptions>;

declare namespace ioredisFastify {
  interface IORedisFastifyOptions {
    confKey: string,
  }
}

function redisFastifyPlugin(...[fastify, opts, done] : Parameters<IORedisFastify>) {
  try {
    const confKey = opts.confKey || 'redis';
    const client = defaultClientRedis;
    fastify.decorate(confKey, client);
    done();
  } catch (err) {
    done(err as Error);
  }
}

export default fp(redisFastifyPlugin, {
  fastify: '4.x',
  name: 'redisFastifyPlugin',
});
