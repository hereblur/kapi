import {FastifyInstance} from 'fastify';
import FastifySwagger from '@fastify/swagger';
import FastifySwaggerUI from '@fastify/swagger-ui';
import {OpenAPIV2, OpenAPIV3} from 'openapi-types';
import {SecurityDefinition} from '../types';

export interface ApiDocConfig {
  title?: string;
  description?: string;
  version?: string;
  endpoint?: string;
  protocol?: string;
  documentPath?: string;
  tags?: Array<string>;
}

interface FastifyEx extends FastifyInstance {
  getSecurityDefinitions: () => Array<SecurityDefinition>;
}

function makeSecurityDefinitions(
  fastify: FastifyEx,
): Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SecuritySchemeObject> {
  const result: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SecuritySchemeObject> = {};
  
  const defs = fastify.getSecurityDefinitions();
  if (defs && defs.length > 0) {
    defs.forEach(def => {
      const {index, func, ...rest} = def;
      result[index] = rest as OpenAPIV3.SecuritySchemeObject;
    });
  }

  return result;
}

export default function useOpenAPI(config: ApiDocConfig) {
  return async (fastify: FastifyInstance) => {
    await fastify.register(FastifySwagger, {
      //swagger: {
      //  info: {
      //    title: config.title || 'Untitled document',
      //    description:
      //      config.description || config.title || 'Untitled document',
      //    version: config.version || '0.0.1',
      //  },
      //  host: config.endpoint || 'localhost',
      //  schemes: [config.protocol || 'http'],
      //  consumes: ['application/json'],
      //  produces: ['application/json'],
      //  tags: [...(config.tags || []).map(name => ({name}))],
      //  definitions: {},
      //  securityDefinitions: makeSecurityDefinitions(fastify as FastifyEx),
      //},
      hideUntagged: false,
      openapi: {
        info: {
          title: config.title || 'Untitled document',
          description:
            config.description || config.title || 'Untitled document',
          version: config.version || '0.0.1',
        },
        servers: [
          {
            url: config.endpoint || 'localhost',
          },
        ],
        components: {
          securitySchemes: makeSecurityDefinitions(fastify as FastifyEx),
        },
      }
    });

    await fastify.register(FastifySwaggerUI, {
      routePrefix: config.documentPath || '/documentations',
      uiConfig: {
        deepLinking: false,
      },
      staticCSP: config?.protocol === 'https' ? true : false,
      transformStaticCSP: header => header,
      // hideUntagged: false,
    });
  };
}
