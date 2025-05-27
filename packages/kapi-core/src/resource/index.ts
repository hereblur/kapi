import {
  IDatabaseModel,
  QueryListAdaptor,
  QueryListParam,
  QueryListResults,
  ResourceAction,
} from '../types/crud';
import ResourceSchema from '../schema';
import {mayi} from '../acl';
import {IACLActor, IAuthFunction} from '../types/acl';
import {ErrorToHttp, HttpMethod, ResourceMethodsMapping} from '../types/http';
import {SchemaHook, SchemaHookFunc, SchemaHookParams} from '../types/hook';
import {endpointWithIDSchema} from './endpoints';
import {
  IDataRecord,
  ResourceEndpoint,
  ResourceHandlerParams,
  TypeID,
} from '../types/common';
import {PermissionMap, ValidateAction} from '../types/schema';
import {AnyObjectSchema, array, InferType} from 'yup';
import NoCache from './nocache';
import CacheManager from './cache';
import DefaultAdaptor from '../list/DefaultAdaptor';

const defaultMethodsMapping: ResourceMethodsMapping = {
  create: 'POST',
  replace: 'PUT',
  update: 'PATCH',
  delete: 'DELETE',
  get: 'GET',
  list: 'GET',
};

const defaultAvailableActions: Array<ResourceAction> = [
  'create',
  'get',
  'update',
  'delete',
  'list',
  'replace',
];


function makeArray(item: any|any[]) {
  if (Array.isArray(item)) {
    return item;
  }
  return [item];
}

export default class Resource<T> {
  resourceName: string;
  private _permissionName: string;
  schema: ResourceSchema;
  yup: AnyObjectSchema;
  dbModel: IDatabaseModel<T> | null = null;
  availableActions: Array<ResourceAction> = [];
  permissionsAlias: PermissionMap = {};
  authMethods: string[] = [];
  private _tags: string[] = [];

  methodsMapping: ResourceMethodsMapping = defaultMethodsMapping;

  endpoints: ResourceEndpoint[] = [];

  listAdaptor: QueryListAdaptor<T> = DefaultAdaptor;
  cache: CacheManager = new CacheManager(NoCache);

  private preListHook: SchemaHookFunc<QueryListParam>[] = [];
  private preCreateHook: SchemaHookFunc<T>[] = [];
  private preUpdateHook: SchemaHookFunc<T>[] = [];
  private preReplaceHook: SchemaHookFunc<T>[] = [];
  private preDeleteHook: SchemaHookFunc<T>[] = [];

  private postListHook: SchemaHookFunc<QueryListResults<T>>[] = [];
  private postViewHook: SchemaHookFunc<T>[] = [];
  private postCreateHook: SchemaHookFunc<T>[] = [];
  private postReplaceHook: SchemaHookFunc<T>[] = [];
  private postUpdateHook: SchemaHookFunc<T>[] = [];
  private postDeleteHook: SchemaHookFunc<T>[] = [];

  static AuthMethods: Record<string, IAuthFunction> = {};

  constructor(resourceName: string, schema: AnyObjectSchema) {
    this.yup = schema;
    this.schema = new ResourceSchema(schema);
    this.resourceName = resourceName;
    this.permissionsAlias = {};
    this._permissionName = resourceName;
    this._tags = [resourceName];
  }

  generateEndpoints(): ResourceEndpoint[] {
    const endpoints: ResourceEndpoint[] = [];

    if (this.methodsMapping.get && this.isEnabled('get')) {
      endpoints.push({
        path: ':id',
        method: this.methodsMapping.get || 'GET',
        action: 'get',

        tags: [...this._tags],
        description: `Get ${this.resourceName} by id`,

        paramsSchema: endpointWithIDSchema,
        responseSchema: this.schema.viewSchema!,
        authentication: this.authMethods,

        handler: async (request: ResourceHandlerParams) => {
          const result = await this.get(
            request.actor,
            request.params?.id || 'undefined',
          );
          return {
            body: result,
          };
        },
      });
    }

    if (this.methodsMapping.update && this.isEnabled('update')) {
      endpoints.push({
        path: ':id',
        method: this.methodsMapping.update,
        action: 'update',

        tags: [...this._tags],
        description: `Update ${this.resourceName} by id`,

        paramsSchema: endpointWithIDSchema,
        bodySchema: this.schema.updateSchema!,
        responseSchema: this.schema.viewSchema!,
        authentication: this.authMethods,

        handler: async (request: ResourceHandlerParams) => {
          const result = await this.update(
            request.actor,
            request.params?.id || 'undefined',
            request.body as Partial<T>,
          );
          return {
            body: result as Object,
          };
        },
      });
    }

    if (this.methodsMapping.replace && this.isEnabled('replace')) {
      endpoints.push({
        path: ':id',
        method: this.methodsMapping.replace,
        action: 'replace',

        tags: [...this._tags],
        description: `Replace ${this.resourceName} by id`,

        paramsSchema: endpointWithIDSchema,
        bodySchema: this.schema.replaceSchema!,
        responseSchema: this.schema.viewSchema!,
        authentication: this.authMethods,

        handler: async (request: ResourceHandlerParams) => {
          const result = await this.replace(
            request.actor,
            request.params?.id || 'undefined',
            request.body as T,
          );
          return {
            body: result,
          };
        },
      });
    }

    if (this.methodsMapping.create && this.isEnabled('create')) {
      endpoints.push({
        path: '',
        method: this.methodsMapping.create,
        action: 'create',

        tags: [...this._tags],
        description: `Create ${this.resourceName}`,

        bodySchema: this.schema.createSchema!,
        responseSchema: this.schema.viewSchema!,
        authentication: this.authMethods,

        handler: async (request: ResourceHandlerParams) => {
          const result = await this.create(request.actor, request.body as T);
          return {
            body: result as Object,
          };
        },
      });
    }

    if (this.methodsMapping.delete && this.isEnabled('delete')) {
      endpoints.push({
        path: ':id',
        method: this.methodsMapping.delete,
        action: 'delete',

        tags: [...this._tags],
        description: `Delete ${this.resourceName} by id`,

        paramsSchema: endpointWithIDSchema,
        responseSchema: this.schema.viewSchema!,
        authentication: this.authMethods,

        handler: async (request: ResourceHandlerParams) => {
          const result = await this.delete(
            request.actor,
            request.params?.id || 'undefined',
          );
          return {
            body: {},
            headers: {'x-deleted-id': `${result}`},
          };
        },
      });
    }

    if (this.methodsMapping.list && this.listAdaptor && this.isEnabled('list')) {
      endpoints.push({
        path: '',
        method: this.methodsMapping.list,
        action: 'list',

        tags: [...this._tags],
        description: `Query ${this.resourceName} list`,

        querySchema: this.listAdaptor?.querySchema,
        paramsSchema: this.listAdaptor?.paramsSchema,
        bodySchema: this.listAdaptor?.bodySchema,
        // this.listAdaptor?.headersSchema ?

        responseSchema: this.listAdaptor?.responseSchema || array(this.schema.viewSchema),
        // this.listAdaptor?.responseHeadersSchema ?
        authentication: this.authMethods,

        handler: async (request: ResourceHandlerParams) => {
          const response = await this.list(request.actor, request.query, request.params, request.body, request.headers);
 
          return {
            body: response.body,
            headers: response.headers,
          };
        },
      });
    }

    return [...endpoints, ...this.endpoints];
  }

  addEndpoints(endpoint: ResourceEndpoint) {
    this.endpoints.push(endpoint);
  }

  getConnection(): IDatabaseModel<T> {
    if (!this.dbModel) {
      throw new Error(`No database defined for resource ${this.resourceName}`);
    }

    return this.dbModel;
  }

  static registerAuthMethod(name: string, authMethod: IAuthFunction) {
    if (this.AuthMethods[name]) {
      throw new Error(`Auth Method ${name} already registered`);
    }

    this.AuthMethods[name] = authMethod;
  }

  static authenticate(authMethod: string, headers?: Record<string, string>,
    query?: Record<string, string>,
    params?: Record<string, string>,
    body?: unknown,
    request?: unknown): Promise<IACLActor|null> {

      const authFn = Resource.AuthMethods[authMethod];
      if (!authFn) {
        throw new Error(`Authentication Method ${authMethod} not registered`);
      }

      return authFn(headers, query, params, body, request);
  }

  async authenticate(headers?: Record<string, string>,
    query?: Record<string, string>,
    params?: Record<string, string>,
    body?: unknown) {

    if (!this.authMethods || this.authMethods.length === 0) {
      return { permissions: [], _: "No authenticated" } as IACLActor;
    }

    for (const authMethod of this.authMethods) {
      const acl = await Resource.authenticate(authMethod, headers, query, params, body);
      if (acl) {
        return acl;
      }
    }
    
    throw new ErrorToHttp('Unauthorized', 401, true);
  }

  setAuthMethod(authMethod: string|string[]|null) {
    if (Array.isArray(authMethod)) {
      
      for (const method of authMethod) {
        if (!Resource.AuthMethods[method]) {
          throw new Error(`Authentication Method ${method} not registered`);
        }
      }

      this.authMethods = authMethod;
    }
    if (typeof authMethod === 'string') {
      this.setAuthMethod([authMethod]);
    }
    if (authMethod === null) {
      this.setAuthMethod([]);
    }
  }

  checkDatabaseMethod(dbModel: IDatabaseModel<T>, action: string) {
    let haveModelFn = false;
    switch (action) {
      case 'get':
        haveModelFn = !!dbModel.get;
        break;
      case 'update':
        haveModelFn = !!dbModel.update;
        break;
      case 'replace':
        haveModelFn = !!dbModel.replace;
        break;
      case 'create':
        haveModelFn = !!dbModel.create;
        break;
      case 'delete':
        haveModelFn = !!dbModel.delete;
        break;
      case 'list':
        haveModelFn = !!dbModel.list;
        break;
    }

    if (!haveModelFn) {
      console.error(
        `Model not defined ${this.resourceName}.${action}, found [${Object.keys(dbModel).join(', ')}]}]`,
      );
      throw new ErrorToHttp(
        `Model not defined ${this.resourceName}.${action}`,
        404,
        {
          message: 'Not found.',
        },
      );
    }
  }

  checkPermission(actor: IACLActor, action: ValidateAction | 'delete') {
    if (
      !mayi(
        actor,
        this.permissionsAlias[action] || `${action}.${this._permissionName}`,
      )
    ) {
      throw new ErrorToHttp(
        `Permission denied ${action}.${this._permissionName}`,
        403,
        {
          message: 'Permission denied',
          action,
          permissionAlias: this.permissionsAlias,
          permissionName: this._permissionName,
        },
      );
    }
  }

  async runHook<T>(
    hook: SchemaHook<T> | null,
    data: T,
    params: SchemaHookParams<T>,
  ): Promise<T> {
    if (!hook) {
      return data;
    }

    if (!Array.isArray(hook)) {
      return await this.runHook([hook], data, params);
    }

    let data_ = data;
    for (const h of hook) {
      data_ = await h(data_, params);
    }

    return data_;
  }

  async viewAs(data: IDataRecord, actor: IACLActor): Promise<T> {
    const output: IDataRecord = {id: (data as any).id}; 

    if (!data) {
      return data;
    }

    if (
      !mayi(
        actor,
        this.permissionsAlias['view'] || `view.${this._permissionName}`,
      )
    ) {
      throw new ErrorToHttp('Permission denied', 403, true);
    }

    Object.keys(this.schema.viewTransforms).forEach(fname => {
      const $view = this.schema.viewTransforms[fname];

      if ($view === false) {
        return;
      }

      if (typeof $view === 'function') {
        output[fname] = $view(data[fname], actor, data);
        return;
      }

      if (typeof $view === 'string') {
        if (!mayi(actor, $view)) {
          return;
        }
      }

      output[fname] = data[fname];
    });

    return this.runHook(this.postViewHook, output as T, {
      resourceName: this.resourceName,
      raw: data as T,
      actor,
      action: 'get',
    });
  }

  
  async _get(id: TypeID): Promise<T|null> {
    return await this.cache.get(this.resourceName, id, async () => {
      const conn = this.getConnection();
      return await conn.get!(id);
    });
  }

  async get(
    actor: IACLActor,
    id: TypeID,
  ): Promise<T> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'get');
    this.checkPermission(actor, 'view');

    const data = await this._get(id);

    return (await this.viewAs(data as IDataRecord, actor)) as InferType<
      typeof this.schema.yup
    >;
  }

  async _update(
    id: string | number,
    update: Partial<T>,
  ): Promise<T> {
    const conn = this.getConnection();
    
    await this.cache.invalidate(this.resourceName, id);
    const result = await conn.update!(id, update);
    return result;

  }

  async update(
    actor: IACLActor,
    id: string | number,
    update_: Partial<T>,
  ): Promise<T> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'update');
    this.checkPermission(actor, 'update');

    let patch = await this.schema.validate<T>(
      'update',
      update_ as T,
      actor,
      id,
    );

    patch = await this.runHook(this.preUpdateHook, patch as T, {
      resourceName: this.resourceName,
      raw: { ...update_, id: (update_ as unknown as IDataRecord).id || id} as T,
      actor,
      action: 'update',
      id,
    });

    const data = await this._update(id, patch);

    await this.runHook(this.postUpdateHook, data, {
      resourceName: this.resourceName,
      action: 'update',
      actor,
      raw: {...update_, id: (update_ as unknown as IDataRecord).id || id} as T,
      id,
    });

    return await this.viewAs(data as IDataRecord, actor);
  }

  async _create(
    params: T,
  ): Promise<T> {
    const conn = this.getConnection();

    await this.cache.invalidate(this.resourceName, null);
    return await conn.create!(params);
  }

  async create(
    actor: IACLActor,
    params_: T,
  ): Promise<T> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'create');
    this.checkPermission(actor, 'create');

    let params = await this.schema.validate('create', params_, actor);

    params = await this.runHook(this.preCreateHook, params, {
      resourceName: this.resourceName,
      raw: params_,
      actor,
      action: 'create',
    });

    const data = await this._create(params);
    console.log("created ", data);

    await this.runHook(this.postCreateHook, data, {
      resourceName: this.resourceName,
      action: 'create',
      actor,
      raw: params,
      id: (data as unknown as IDataRecord).id,
    });

    return await this.viewAs(data as IDataRecord, actor);
  }

  async _replace(
    id: string | number,
    params: T,
  ): Promise<T> {
    const conn = this.getConnection();

    await this.cache.invalidate(this.resourceName, id);
    return await conn.replace!(id, params);
  }

  async replace(
    actor: IACLActor,
    id: string | number,
    params_: T,
  ): Promise<T> {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'replace');
    this.checkPermission(actor, 'replace');

    let params = await this.schema.validate('replace', params_, actor);

    params = await this.runHook(this.preReplaceHook, params, {
      resourceName: this.resourceName,
      raw: params_,
      actor,
      action: 'replace',
    });

    const data = await this._replace(id, params);

    await this.runHook(this.postReplaceHook, data, {
      resourceName: this.resourceName,
      action: 'replace',
      actor,
      raw: params,
      id: (data as unknown as IDataRecord).id,
    });

    return await this.viewAs(data as IDataRecord, actor);
  }

  async _delete(id: string | number) {
    const conn = this.getConnection();

    await this.cache.invalidate(this.resourceName, id);
    return await conn.delete!(id);
  }

  async delete(actor: IACLActor, id: string | number) {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'delete');
    this.checkPermission(actor, 'delete');

    await this.runHook(
      this.preDeleteHook,
      { id } as T,
      {
        resourceName: this.resourceName,
        action: 'delete',
        actor,
        id,
        raw: {id} as T,
      },
    );

    const data = await this._delete(id);

    return await this.runHook(
      this.postDeleteHook,
      {id, deleted: data} as T,
      {
        resourceName: this.resourceName,
        action: 'delete',
        actor,
        raw: {id} as T,
        id: id,
      },
    );
  }

  async _list(params: QueryListParam) {

    return await this.cache.list(this.resourceName, params, async () => {
      const conn = this.getConnection();
      const {total, data} = await conn.list!(params);

      return {total, data};
    }) || {total: 0, data: []};

  }

  async list(actor: IACLActor, queryString?: Record<string,string>|null, params?: Record<string,string>|null, body?: unknown|null, headers?: Record<string,string>|null) {
    const conn = this.getConnection();
    this.checkDatabaseMethod(conn, 'list');
    this.checkPermission(actor, 'view');

    if (!this.listAdaptor) {
      throw new ErrorToHttp(`Resource invalid configuration(no adaptor) `, 500);
    }
    let qparams = this.listAdaptor.parser(this.resourceName, queryString, params, body, headers)

    qparams = await this.runHook<QueryListParam>(this.preListHook, qparams, {
      resourceName: this.resourceName,
      raw: qparams,
      actor,
      action: 'list',
    });

    const results = await this._list(qparams);

    const { total, data } = await this.runHook<QueryListResults<T>>(this.postListHook, results, {
      resourceName: this.resourceName,
      action: 'create',
      actor,
      raw: results,
      id: 0,
    });

    const data_ = await Promise.all(
      data.map(async row => {
        // const row_ = await this.schema.validate('view', row, actor)
        return (await this.viewAs(row as IDataRecord, actor)) as InferType<
          typeof this.schema.yup
        >;
      }),
    );

    return this.listAdaptor.response(
      {
        total, data: data_
      },
      qparams,
      this.resourceName

    );
  }

  addHook(hook: 'preCreate' | 'preUpdate' | 'preReplace' | 'preDelete' | 'preList' | 'postView' | 'postCreate' | 'postReplace' | 'postUpdate' | 'postDelete' | 'postList', h: SchemaHook<T>|SchemaHook<QueryListParam>|SchemaHook<QueryListResults<T>>) {
    switch (hook) {
      case 'preCreate':
        this.preCreateHook.push(...(makeArray(h)));
        break;
      case 'preReplace':
        this.preReplaceHook.push(...(makeArray(h)));
        break;
      case 'preUpdate':
        this.preUpdateHook.push(...(makeArray(h)));
        break;
      case 'preDelete':
        this.preDeleteHook.push(...(makeArray(h)));
        break;
      case 'preList':
        this.preListHook.push(...(makeArray(h)));
        break;

      case 'postView':
        this.postViewHook.push(...(makeArray(h)));
        break;
      case 'postCreate':
        this.postCreateHook.push(...(makeArray(h)));
        break;
      case 'postReplace':
        this.postReplaceHook.push(...(makeArray(h)));
        break;
      case 'postUpdate':
        this.postUpdateHook.push(...(makeArray(h)));
        break;
      case 'postDelete':
        this.postDeleteHook.push(...(makeArray(h)));
        break;
      case 'postList':
        this.postListHook.push(...(makeArray(h)));
        break;
    }
  } 

  httpMethod(action: ResourceAction, m: HttpMethod | null) {
    this.methodsMapping[action] = m;
  }

  isEnabled(s: ResourceAction) {
    return this.availableActions.indexOf(s) !== -1;
  }

  enable(action: ResourceAction) {
    if (!this.isEnabled(action)) {
      this.availableActions.push(action);
    }
  }

  disable(action: ResourceAction) {
    if (this.isEnabled(action)) {
      this.availableActions.splice(this.availableActions.indexOf(action), 1);
    }
  }

  set model(d: IDatabaseModel<T>) {
    this.dbModel = d;

    const actions: ResourceAction[] = [];
    if (this.dbModel.create) {
      actions.push('create');
    }
    if (this.dbModel.update) {
      actions.push('update');
    }
    if (this.dbModel.replace) {
      actions.push('replace');
    }
    if (this.dbModel.delete) {
      actions.push('delete');
    }
    if (this.dbModel.get) {
      actions.push('get');
    }
    if (this.dbModel.list) {
      actions.push('list');
    }

    this.availableActions = actions;
  }

  set permissionName(p: string) {
    this._permissionName = p;
  }

  get permissionName(): string {
    return this._permissionName;
  }

  get tags(): string[] {
    return [...this._tags];
  }
  set tags(t: string[]) {
    this._tags = t;
  }
}
