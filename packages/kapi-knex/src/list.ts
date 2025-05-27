import {QueryListParam, QueryFilter, QueryListFunction} from '@kapi/core';

import {Knex} from 'knex';
import dayjs from 'dayjs';

export interface KnexQueryListOptions<T> {
  searchFields?: Array<keyof T>; // Free text search fields
  debug?: boolean; // Return debug information
}

interface TotalRow {
  T: number;
}

export interface KnexQueryBuilder {
  clone: () => Knex;
}

const knexCloneIQuery = (query: Knex): Knex => {
  const q: unknown = query;
  return (q as KnexQueryBuilder).clone();
};

export function KnexQueryList<T>(
  options: KnexQueryListOptions<T>,
  getKnex: Function
): QueryListFunction<T> {
  const func: QueryListFunction<T> = async (params: QueryListParam) => {
    const query = getKnex('list');

    query.where((query: Knex) => {
      params.filter.forEach((f: QueryFilter) => {
        const {field, op, value} = f;
        if ((field === 'q' || field === 'search') && op === '=') {
          query.andWhere((query: Knex) => {
            (options.searchFields || []).forEach(k => {
              query.orWhere(
                k as string,
                'LIKE',
                `%${`${value}`.replace(/(["'$%]+)/g, '')}%`
              );
            });
          });
          return;
        }

        let values: Array<string | number> = [];
        if (Array.isArray(value)) {
          values = value as Array<string | number>;
        }

        switch (op) {
          case '=':
            query.where(field, value);
            return;
          case '!=':
            query.whereNot(field, value);
            return;
          case '>':
          case '>=':
          case '<':
          case '<=':
            query.where(field, op, value);
            return;
          case 'in':
            query.whereIn(field, values);
            return;
          case '!in':
            query.whereNotIn(field, values);
            return;
          case 'contains':
            query.whereILike(field, `%${value}%`);
            return;
          case '!contains':
            query.whereRaw(`\`${field}\` NOT LIKE ?`, [`%${value}%`]);
            return;
          case 'between':
            if (query.client.config.client === 'sqlite3') {
              query.whereBetween(field, [dayjs(values[0]).format('YYYY-MM-DD HH:mm:ss'), dayjs(values[1]).format('YYYY-MM-DD HH:mm:ss')] );
            } else {
              query.whereBetween(field, [values[0], values[1]]);
            }
            
            return;
          case '!between':
            query.whereNotBetween(field, [values[0], values[1]]);
            return;
          case 'null':
            query.whereNull(field);
            return;
          case '!null':
            query.whereNotNull(field);
            return;
        }
      });
    });

    const data = await knexCloneIQuery(query)
      .offset(params.range.offset)
      .limit(params.range.limit)
      .orderBy(params.sort.map(s => ({column: s.field, order: s.direction})));

    const totalRow: Array<TotalRow> = await knexCloneIQuery(query)
      .clearSelect()
      .count('* AS T');
    const total = totalRow && totalRow.length ? totalRow[0].T : 0;

    let debug = null;

    if (options.debug) {
      debug = await knexCloneIQuery(query)
        .offset(params.range.offset)
        .limit(params.range.limit)
        .orderBy(params.sort.map(s => ({column: s.field, order: s.direction})))
        .toString();
      // console.log(debug);
    }

    return {
      total,
      data,
      ...(debug ? {debug} : {}),
    };
  };

  return func;
}
