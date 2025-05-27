import {FastifyInstance} from 'fastify';
import FastifyCors from '@fastify/cors';

export default function useCors(
  domains?: Array<string | RegExp>,
  allowedHeaders?: Array<string>,
  exposedHeaders?: Array<string>,
  methods?: Array<string>,
) {
  return (fastify: FastifyInstance) => {
    fastify.register(FastifyCors, {
      origin: domains || ['localhost'],
      methods: methods || ['GET', 'PUT', 'POST', 'DELETE', 'HEAD', 'PATCH'],
      allowedHeaders: allowedHeaders || [],
      exposedHeaders: exposedHeaders || allowedHeaders || [],
    });
  };
}
