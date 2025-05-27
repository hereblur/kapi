import { request } from "http";

export interface IACLActor extends Object {
  permissions: Array<string>;
}

export interface IAuthFunction {
  (headers?: Record<string, string>,
   query?: Record<string, string>,
   params?: Record<string, string>,
   body?: unknown,
   request?: unknown): Promise<IACLActor|null>;
}