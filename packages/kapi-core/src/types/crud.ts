import { AnyObjectSchema } from "yup";

export type QueryFilterOperator =
  | '='
  | '!='
  | '>'
  | '>='
  | '<'
  | '<='
  | 'in'
  | '!in'
  | 'contains'
  | '!contains'
  | 'between'
  | '!between'
  | 'null'
  | '!null';

export type ResourceAction =
  | 'create'
  | 'get'
  | 'update'
  | 'delete'
  | 'list'
  | 'replace';

export type QueryFilter = {
  field: string;
  op: QueryFilterOperator;
  value: number | string | Date | Array<number | string | Date>;
};

export type QueryRange = {
  offset: number;
  limit: number;
};

export type QuerySort = {
  field: string;
  direction: 'ASC' | 'DESC';
};

export type QueryListParam = {
  resource: string;
  filter: QueryFilter[];
  range: QueryRange;
  sort: QuerySort[];
};

export type QueryListResults<T> = {
  data: T[];
  total: number;
};
export type QueryListFunction<T> = {
  (params: QueryListParam): Promise<QueryListResults<T>>;
};

export type QueryListResponse<T> = {
  body: unknown;
  headers?: Record<string, string>;
};

export interface IDatabaseModel<T> {
  get?: (id: string | number) => Promise<T>;
  update?: (id: string | number, patch: Partial<T>) => Promise<T>;
  replace?: (id: string | number, data: T) => Promise<T>;
  create?: (data: T) => Promise<T>;
  delete?: (id: string | number) => Promise<number>;
  list?: QueryListFunction<T>;
}

export type DatabaseModelGetter<T> = (
  resourceName: string,
  action: string,
) => IDatabaseModel<T>;

export type QueryListAdaptor<T> = {
  parser: (resource: string, queryString?: Record<string,string>|null, params?: Record<string,string>|null, body?: unknown, headers?: Record<string,string>|null) => QueryListParam;
  response: (
    result: QueryListResults<T>,
    params: QueryListParam,
    name: string,
  ) => QueryListResponse<T>;
  params: string[];

  querySchema?: AnyObjectSchema; // for documentation
  paramsSchema?: AnyObjectSchema; // for documentation
  bodySchema?: AnyObjectSchema; // for documentation
  headersSchema?: AnyObjectSchema; // for documentation
  responseSchema?: AnyObjectSchema; // for documentation
  responseHeadersSchema?: AnyObjectSchema; // for documentation
};

export type IDType = string | number;

export interface IRecord {
  id: IDType;
  [key: string]: unknown;
}
