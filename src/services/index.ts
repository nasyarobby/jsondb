import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import RESPONSE_CODES from '../responseCodes/responseCodes.js';
import { errorResponse, failResponse } from '../utils/etc.js';

export default function getService(fastify:FastifyInstance) {
  return {
    readData: async () => {},
    writeData: async () => {},
  };
}
