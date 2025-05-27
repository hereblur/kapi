import {Schema} from 'yup';
import {IACLActor} from './acl';
import {ResourceAction} from './crud';

export type TypeID = string | number;
export type WithID = {id: TypeID};

export interface IDataRecord {
  id: TypeID;
  [key: string]: unknown;
}
export type ResourceHandler = (
  request: ResourceHandlerParams,
) => Promise<ResourceEndpointReponse>;

export type ResourceHandlerParams = {
  method: String;
  path: String;

  query?: Record<string, string> | null;
  params?: Record<string, string> | null;
  body?: unknown | null;
  headers?: Record<string, string> | null;

  actor: IACLActor | null;

  request?: unknown;
};

export type ResourceEndpointReponse = {
  headers?: Record<string, string>;
  statusCode?: number;
  body?: unknown;
};

export type ResourceEndpoint = {
  path: string;
  method: string;
  action?: ResourceAction;
  authentication?: string[];

  tags?: Array<string>;
  description?: string;

  querySchema?: Schema;
  paramsSchema?: Schema;
  bodySchema?: Schema;
  responseSchema?: Schema;

  handler: ResourceHandler;
};
