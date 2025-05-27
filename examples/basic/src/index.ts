import KapiFastify, {
  useCors,
  useResources,
  useOpenAPI,
} from '@kapi/fastify';

import { PersonResource } from './resources/person';
import { PhotoResource } from './resources/photo';

const apiPrefix = '/api/v1';

async function Start() {
  const port = process.env.PORT ? parseInt(process.env.PORT) : 9000;


  await KapiFastify({
    name: `Kapi is for lazy people`,
    port: port,
    host: '0.0.0.0',
    fastifyOptions: {
      /* see https://fastify.dev/docs/latest/Reference/Server */
      logger: true
    },
    securityDefinitions: [],

    plugins: [
      
      // Custom plugins, to customize your fastify server using standard plugins or hooks.
      (fastify) => {
        fastify.addHook('onRequest', async (request, reply) => {
          reply.header('x-server', 'kapi-fastify');
        })
      },

      // Built-in plugins, to generate openapi documents.
      useOpenAPI({
        title: `Kapi is for lazy people - API documents`,
        protocol: 'http',
        endpoint: `localhost:${port}`,
        documentPath: `${apiPrefix}/documents`,
        version: process.env.VERSION || 'dev',
      }),

      // Built-in plugins, to setup cors.
      useCors(
        [
          /^http:\/\/localhost$/,
          /^http:\/\/localhost:(\d{1,5})$/,
          'localhost:9001',
          'localhost:3001',
          /real\.production\.domain$/
        ],
        ['authorization', 'content-type', 'x-scope'],
        ['content-length', 'content-range']
      ),

      // Built-in plugins, to build resource endpoints.
      useResources(
        [
          PersonResource,
          PhotoResource,
        ]
      ),
    ],
  });
}

Start();
