import {Knex} from 'knex';

export type IConnectionProvider = (
  _resourceName: string,
  _action: string
) => Knex;
