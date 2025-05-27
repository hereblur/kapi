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
    // console.log(`getting ${id}`);
    const c = await getKnex('get')
      .select('*')
      .where('id', id)
      .then(t => {
        // console.log('got', t);
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

    const knexInstance = getKnex('create');
    let insertedId: unknown;

    if (knexInstance.client.config.client === 'sqlite3') {
      // SQLite does not support `.returning('id')`
      const inserted = await knexInstance.insert({
        ...params,
      });

      if (params.id) {
        insertedId = params.id
      } else
      if (inserted && typeof inserted === 'object' && 'id' in inserted) { // sqlite3?
        insertedId = (insertedId as {id: string | number}).id;
      } else {
        const inserted = await knexInstance
          .select('id')
          .where(params)
          .orderBy('id', 'desc')
          .limit(1);

        if (inserted.length > 0) {
          insertedId = inserted[0].id;
        } else {
          throw new Error(`Failed to retrieve inserted ID for ${tableName}`);
        }
      }
    } else {
      // For other SQL clients that support `.returning('id')`
      const inserted = await knexInstance
        .returning('id')
        .insert({
          ...params,
        });

      insertedId = inserted[0];
    }


    const insertedData = await get(insertedId as string | number);
    // console.log('inserted', insertedId, insertedData);

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
