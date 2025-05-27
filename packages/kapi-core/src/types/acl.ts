export interface IACLActor {
  permissions: Array<string>;
}

export interface IAuthFunction {
  (headers?: Record<string, string>,
   query?: Record<string, string>,
   params?: Record<string, string>,
   body?: unknown,
   request?: unknown): Promise<IACLActor|null>;
}