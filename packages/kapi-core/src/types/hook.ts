import {IACLActor} from './acl';
import {IDataRecord, TypeID} from './common';
import { ResourceAction } from './crud';

export type SchemaHookParams<T> = {
  resourceName: string;
  action: ResourceAction;
  actor: IACLActor;
  raw: T;
  id?: TypeID;
};

export type SchemaHookFunc<T> = (
  data: T,
  params: SchemaHookParams<T>,
) => T | Promise<T>;

export type SchemaHook<T> = SchemaHookFunc<T> | SchemaHookFunc<T>[];
