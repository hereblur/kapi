import {IACLActor, IAuthFunction} from '@kapi/core';
import {FastifyRequest} from 'fastify';
import {OpenAPIV2} from 'openapi-types';

export interface FastifyRequestWithAuth extends FastifyRequest {
  user?: IACLActor | unknown;
}

export type SecurityDefinition = OpenAPIV2.SecuritySchemeObject & {
  index: string;
  func: IAuthFunction;
};
