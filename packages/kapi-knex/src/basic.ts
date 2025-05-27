import {IDatabaseModel, ResourceAction} from '@kapi/core';
import {Knex} from 'knex';
import {KnexQueryList, KnexQueryListOptions} from './list';
import {IConnectionProvider} from './types';

export function SimpleKnexConnection<T>(
  connectionProvider: IConnectionProvider | Knex,
  options: KnexQueryListOptions<T>,
  tableName: string
): IDatabaseModel<T> {
  const getKnex = (action: ResourceAction): Knex => {
    if (typeof connectionProvider === 'function') {
      return connectionProvider(tableName, action) as Knex;
    }

    return connectionProvider;
  };

  const get = async (id: string | number) => {
    console.log(`getting ${id}`);
    const c = await getKnex('get')
      .select('*')
      .where('id', id)
      .then(t => {
        console.log('got', t);
        return t[0];
      });

    return c;
  };

  const update = async (id: string | number, patch: object) => {
    await getKnex('update').where('id', id).update(patch);

    return await get(id);
  };

  const create = async (params_: object) => {
    const params = {
      ...params_,
    } as Record<string, unknown>;

    const result = await getKnex('create')
      .returning('id')
      .insert({
        ...params,
      });

    let insertedId = (params as {id?: string | number}).id || result[0];

    if (insertedId && typeof insertedId === 'object' && 'id' in insertedId) { // sqlite3?
      insertedId = (insertedId as {id: string | number}).id;
    }

    const insertedData = await get(insertedId);
    console.log('inserted', insertedId, insertedData);

    return insertedData;
  };

  const replace = async (id: string | number, params_: object) => {
    const params = {
      id,
      ...params_,
    } as Record<string, unknown>;

    const fields: Array<string> = [];
    const values: Array<unknown> = [];
    Object.keys(params).forEach(f => {
      fields.push(`\`${f}\`=?`);
      values.push(params[f]);
    });

    await getKnex('replace').raw(
      `REPLACE INTO ${tableName}(${fields.join(', ')})`,
      values
    );

    const insertedData = await get(id);

    return insertedData;
  };

  const delete_ = async (id: string | number) => {
    const result = await getKnex('delete').where('id', id).delete();

    return result;
  };

  const list = KnexQueryList(options, getKnex);

  return {
    get,
    replace,
    update,
    create,
    delete: delete_,
    list,
  } as IDatabaseModel<T>;
}
