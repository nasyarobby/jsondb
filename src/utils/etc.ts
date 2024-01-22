import ClientError from '../plugins/ClientError.js';
import ServerError from '../plugins/ServerError.js';

export function failResponse(message: string, code: Uppercase<string>, data?: any, err?: any) {
  return new ClientError({
    code,
    message,
    data,
    originalError: err,
  });
}

export function errorResponse(message: string, code: Uppercase<string>, data?: any, err?: any) {
  return new ServerError({
    code,
    message,
    data,
    originalError: err,
  });
}
