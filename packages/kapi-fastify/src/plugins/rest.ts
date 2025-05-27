import {
  FastifyInstance,
  FastifySchema,
  RouteHandler,
  RouteHandlerMethod,
  RouteShorthandOptions,
} from 'fastify';

import {
  Resource,
  ResourceHandler,
  ResourceEndpoint,
  ErrorToHttp,
} from '@kapi/core';
import {getActor, getPreValidate} from './rest/common';
import {AnyObjectSchema, AnySchema, object, string} from 'yup';
import {convertSchema as convertYupSchema} from '@sodaru/yup-to-json-schema';

export interface RestResourceDefinitionsOptions {
  prefix?: string;
}

export interface RestResourceDefinitions<T extends AnyObjectSchema>
  extends RestResourceDefinitionsOptions {
  resource: Resource<T>;
  path?: string;
}

function convertSchema(schema: AnySchema) {
  const jsonSchema = convertYupSchema(schema);
  delete jsonSchema.default;
  return jsonSchema as FastifySchema;
}

const httpErrorBody = convertSchema(object({
  message: string().required(),
}));

const httpErrors = {
  400: httpErrorBody,
  401: httpErrorBody,
  403: httpErrorBody,
  500: httpErrorBody,
};

const makeParamSchemaFromPath = (path: string) => {
  const pathParts = path.split('/');
  const paramsSchema: Record<string, AnySchema> = {};
  pathParts.forEach(p => {
    if (p.charAt(0) === ':') {
      const paramName = p.substring(1);
      paramsSchema[paramName] = string().required();
    }
  });

  if (Object.keys(paramsSchema).length === 0) {
    return undefined;
  }

  // console.log(paramsSchema, JuadzSchema.toJsonSchema(paramsSchema));

  return object().shape(paramsSchema);
};

export default function useResources(
  resources: Array<RestResourceDefinitions<any> | Resource<any>>,
) {
  return async (fastify: FastifyInstance) => {
    const getDefinitions = (
      resourceDef: RestResourceDefinitions<any>,
    ): RestResourceDefinitions<any> => {
      const prefix = (resourceDef.prefix || '').replace(/\/+$/, '');
      return {
        path: `${prefix}/${resourceDef.resource.resourceName}`,
        ...resourceDef,
      };
    };

    const makePath = (
      resourceDef: RestResourceDefinitions<any>,
      endpointPath: string,
    ) => {
      const def = getDefinitions(resourceDef);

      if (endpointPath && endpointPath.length) {
        if (endpointPath.charAt(0) === '/') {
          return endpointPath;
        }
        return [def.path, endpointPath].join('/');
      }

      return `${def.path}`;
    };

    const makeRoute = (
      method: string,
      path: string,
      schema: RouteShorthandOptions,
      handler: RouteHandler,
    ): void => {
      // console.log('FFFFF', method, path, JSON.stringify(schema, null, 2));
      switch (method.toLowerCase()) {
        case 'get':
          fastify.get(path, schema, handler);
          break;
        case 'post':
          fastify.post(path, schema, handler);
          break;
        case 'put':
          fastify.put(path, schema, handler);
          break;
        case 'patch':
          fastify.patch(path, schema, handler);
          break;
        case 'delete':
          fastify.delete(path, schema, handler);
          break;
        case 'head':
          fastify.head(path, schema, handler);
          break;
      }

      throw new ErrorToHttp(`HTTP method ${method} is not supported.`, 405, true);
    };

    resources.forEach(resourceDef => {
      let realResourceDef = resourceDef;
      if (resourceDef instanceof Resource) {
        realResourceDef = {resource: resourceDef};
      }
      const definitions = getDefinitions(
        realResourceDef as RestResourceDefinitions<any>,
      );
      const {resource} = definitions;

      resource.generateEndpoints().forEach((endpoint: ResourceEndpoint) => {
        const authenticationName: unknown[] = [];
        for (const auth of endpoint.authentication || []) {
          authenticationName.push({[auth]: []});
        }


        const schema = {

          tags: endpoint.tags,
          operationId: endpoint.action ? `${endpoint.action}_${resource.resourceName}` : `${endpoint.path.replace(/\//g, '_')}`,
          summary: endpoint.description,
          description: `#permission(${endpoint.action || '*'}.${resource.permissionName})`,
          security: authenticationName,
          response: {
            200: endpoint.responseSchema ?
              convertSchema(endpoint.responseSchema) :
                  { "type": "object", "additionalProperties": true },
            ...httpErrors
          },
        } as FastifySchema;

        if (endpoint.querySchema) {
          schema.querystring = convertSchema(endpoint.querySchema);
        }
        if (endpoint.bodySchema) {
          schema.body = convertSchema(endpoint.bodySchema);
        }
        if (endpoint.paramsSchema) {
          schema.params = convertSchema(endpoint.paramsSchema);
        } else {
          const paramsSchema = makeParamSchemaFromPath(endpoint.path);
          if (paramsSchema) {
            schema.params = convertSchema(paramsSchema);
          }
        }

        makeRoute(
          endpoint.method,
          makePath(definitions, endpoint.path),
          {
            preValidation: getPreValidate(fastify, endpoint.authentication),
            schema,
          },
          fastifyHandlerAdaptor(fastify, endpoint.handler),
        );
      });
    });
  };
}

function fastifyHandlerAdaptor(
  fastify: FastifyInstance,
  resourceHandler: ResourceHandler,
): RouteHandlerMethod {
  return async (request, reply) => {
    try {
      const result = await resourceHandler({
        method: request.method,
        path: request.url,
        query: request.query as Record<string, string>,
        params: request.params as Record<string, string>,
        body: request.body as object,
        headers: request.headers as Record<string, string>,
        actor: getActor(request),
        request: request,
      });
      reply.headers(result.headers || {}).send(result.body);
    } catch (error) {
      fastify.log.error(error);
      const e = error as ErrorToHttp;

      reply
        .status(e.statusCode || 500)
        .headers(e.headers || {})
        .send(e.body || {message: 'Internal server error'});
    }
  };
}
