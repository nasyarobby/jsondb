import { FastifyError, FastifyInstance } from 'fastify';
import ApiError from './ApiError.js';
import ClientError from './ClientError.js';

type ErrorHandler = Parameters<FastifyInstance['setErrorHandler']>[0];
type SetErrorHandlerParams = Parameters<ErrorHandler>;

const errorHandler:ErrorHandler = function errorHandler(
  ...[error, request, reply]: SetErrorHandlerParams
) {
  if (error instanceof ApiError || error instanceof ClientError) {
    if (error instanceof ApiError) {
      this.log.error({
        err: error,
        req: {
          headers: request.headers,
          body: request.body,
          params: request.params,
          queryString: request.query,
          url: request.url,
        },
      }, 'Server Error');
    }

    if (error instanceof ClientError) {
      this.log.debug({
        err: error,
        req: {
          headers: request.headers,
          body: request.body,
          params: request.params,
          queryString: request.query,
          url: request.url,
        },
      }, 'Client error');
    }

    // Send error response
    const apiError = error as ApiError;
    reply.status(error instanceof ClientError ? 400 : 500);
    reply.send({
      status: 'error',
      message: apiError.message,
      code: apiError.code,
      ...error.data,
      error: error.originalError,
    });
  }

  const fastifyError = error as FastifyError;

  this.log.fatal({
    err: error,
    alert: true,
    req: {
      headers: request.headers,
      body: request.body,
      params: request.params,
      queryString: request.query,
      url: request.url,
    },
  }, 'unhandled errors or database-related errors encountered');

  return reply
    .send({
      error: {
        message: error.message,
        stack: error.stack,
        code: fastifyError.code === undefined ? '500' : fastifyError.code,
      },
    });
};

export default errorHandler;
