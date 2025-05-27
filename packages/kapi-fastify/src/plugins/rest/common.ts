import {
  FastifyInstance,
  FastifyRequest,
  preValidationAsyncHookHandler,
} from 'fastify';
import {FastifyRequestWithAuth} from '../../types';
import {ErrorToHttp, IACLActor, Resource} from '@kapi/core';

export function getActor(request: FastifyRequest): IACLActor|null {
  return (request as FastifyRequestWithAuth).user as IACLActor || null;
}

export function getResourceId(request: FastifyRequest): string {
  return (request.params as Record<string, string>).id as string;
}

export function getPreValidate(
  fastify: FastifyInstance,
  authentication: string[] | undefined,
): preValidationAsyncHookHandler | undefined {
  
  return async (req: FastifyRequestWithAuth, reply) => {

    if (!authentication || authentication.length === 0) {
      return undefined;
    }
  
    for (const auth of authentication) {
      const acl = await Resource.authenticate(
        auth,
        req.headers as Record<string, string>,
        req.query as Record<string, string>,
        req.params as Record<string, string>,
        req.body,
        req,
      );

      if (acl) {
        req.user = acl;
        return acl;
      }
    }

    throw new ErrorToHttp('Unauthorized', 401, true);
  };
}
