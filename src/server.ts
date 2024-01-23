import fastify, { FastifyRequest } from 'fastify';
import fastifyEnv from '@fastify/env';
import { Config, JsonDB } from 'node-json-db';
import jsonata from 'jsonata';
import fastifyCors from '@fastify/cors';
import configSchema from './config.js';
import errorHandler from './plugins/errorHandler.js';
import notFoundHandler from './plugins/notFoundHandler.js';
import ClientError from './plugins/ClientError.js';

async function start() {
  const app = fastify({ logger: true });

  /**
 * Custom Error handler
 */
  app.setErrorHandler(errorHandler);

  app.setNotFoundHandler(notFoundHandler);

  /**
 * Plugin: @fastify/env
 * cek file {@link ./config.ts}
 */
  await app.register(fastifyEnv, {
    schema: configSchema,
  });

  // eslint-disable-next-line no-console
  console.table(app.config);

  await app.register(fastifyCors, {
    // put your options here
  });

  const databases = new Set<{ name: string, instance: JsonDB }>();

  function getDbByName(dbname: string) {
    return Array.from(databases).find((db) => db.name === dbname);
  }

  const dbconfig = new JsonDB(new Config('config.json', true, false, '/'));

  await dbconfig.getData('/databases').then((dbs) => {
    Object.keys(dbs as { [key: string] : { path: string } }).forEach((db) => {
      app.log.info('Loading database: %s', db);
      databases.add({ name: db, instance: new JsonDB(new Config(`db/${db}`, true, false)) });
    });
  });

  app.route({
    method: 'POST',
    url: '/:dbname/init',
    handler: async (req:FastifyRequest<{
      Params: { dbname: string }
    }>, res) => {
      req.log.info({ path: req.url }, 'Path');
      const reqDbName = req.params.dbname;
      const existing = getDbByName(reqDbName);

      if (!existing) {
        const db = new JsonDB(new Config(`db/${reqDbName}`, true, false, '/'));
        databases.add({ name: reqDbName, instance: db });

        dbconfig.push(`/databases/${reqDbName}`, { path: `db/${reqDbName}` });
        db.push('/', req.body);
      }

      return res.send({ db: reqDbName, created: !existing });
    },
  });

  app.route({
    method: 'GET',
    url: '/',
    handler: async (req, res) => Array.from(databases),
  });

  app.route({
    method: 'POST',
    url: '/:dbname/read/*',
    handler: async (req:FastifyRequest<{
      Params: { dbname: string },
      Body: { jsonata?: string, id?: string }
    }>, res) => {
      req.log.info({ path: req.url }, 'Path');
      const { dbname: reqDbName } = req.params;
      const dataPath = req.url.substring(`/read/${reqDbName}`.length);

      const dbInstance = getDbByName(reqDbName);
      if (!dbInstance) {
        throw new ClientError({ code: 'DB_NOT_FOUND', message: `Database ${reqDbName} not found` });
      }

      const db = dbInstance.instance;
      const { jsonata: JSONataExpression } = req.body;

      const index = req.body.id ? await db.getIndex(dataPath, req.body.id) : -1;

      const data = index >= 0 ? await db.getData(`${dataPath}[${index}]`) : await db.getData(dataPath);

      let dataTransformed = data;

      if (JSONataExpression) {
        const expression = jsonata(JSONataExpression);
        dataTransformed = await expression.evaluate(data);
      }

      res.header('X-PATH', dataPath);
      res.header('X-DBNAME', reqDbName);
      return dataTransformed;
    },
  });

  app.route({
    method: 'POST',
    url: '/:dbname/write/*',
    handler: async (req:FastifyRequest<{
      Params: { dbname: string }
    }>, res) => {
      req.log.info({ path: req.url }, 'Path');
      const { dbname } = req.params;
      const dataPath = req.url.substring(`/write/${dbname}`.length);
      const dbInstance = getDbByName(dbname);

      req.log.debug({ databases, dbInstance, dbname }, 'DB instance');

      if (!dbInstance) {
        throw new ClientError({ code: 'DB_NOT_FOUND', message: `Database ${dbname} not found` });
      }

      const db = dbInstance.instance;

      await db.push(dataPath, req.body);

      res.header('X-PATH', dataPath);
      res.header('X-DBNAME', dbname);

      return {};
    },
  });

  app.route({
    method: 'POST',
    url: '/:dbname/delete/*',
    handler: async (req:FastifyRequest<{
      Params: { dbname: string }
    }>, res) => {
      req.log.info({ path: req.url }, 'Path');
      const { dbname } = req.params;
      const dataPath = req.url.substring(`/delete/${dbname}`.length);
      const dbInstance = getDbByName(dbname);
      req.log.debug({ databases, dbInstance, dbname }, 'DB instance');

      if (!dbInstance) {
        throw new ClientError({ code: 'DB_NOT_FOUND', message: `Database ${dbname} not found` });
      }

      const db = dbInstance.instance;
      await db.delete(dataPath);
      res.header('X-PATH', dataPath);
      res.header('X-DBNAME', dbname);

      return { [dataPath]: 'deleted' };
    },
  });

  app.route({
    method: 'POST',
    url: '/:dbname/reload',
    handler: async (req:FastifyRequest<{
      Params: { dbname: string }
    }>, res) => {
      const reqDbName = req.params.dbname;
      const db = new JsonDB(new Config(`db/${reqDbName}`, true, false, '/'));

      const existing = getDbByName(reqDbName);
      if (!existing) {
        databases.add({ name: reqDbName, instance: db });
        dbconfig.push('/databases[]', reqDbName);
      } else {
        await db.reload();
      }
      res.header('X-DBNAME', reqDbName);

      return {};
    },
  });

  app.ready((errorOnAppReady) => {
    app.log.level = app.config.LOG_LEVEL;
    app.log.info('Ready');

    if (errorOnAppReady) {
      app.log.error(errorOnAppReady);
      process.exit(1);
    }

    app.listen({
      host: app.config.HOST,
      port: app.config.PORT,
    }, (err) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
    });
  });
}

start();
