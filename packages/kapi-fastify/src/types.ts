import {IACLActor, IAuthFunction} from '@kapi/core';
import {FastifyRequest} from 'fastify';
import {OpenAPIV2} from 'openapi-types';

export interface FastifyRequestWithAuth extends FastifyRequest {
  user?: unknown;
}

// export interface SimpleObject extends Object {
//   [key: string]: unknown;
// }


export type SecurityDefinition = OpenAPIV2.SecuritySchemeObject & {
  index: string;
  func: IAuthFunction;
};
