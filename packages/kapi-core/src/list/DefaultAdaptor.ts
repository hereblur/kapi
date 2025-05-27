import { object, string } from "yup";
import { QueryFilter, QueryFilterOperator, QueryListAdaptor, QueryListParam } from "../types/crud"

function strToInt(s: string|undefined, def: number) {
    
    if (s === null || s === undefined) return def;

    const n: number = parseInt(s, 10);
    if (isNaN(n)) return def;
    return n;
}/*  */

const DefaultAdaptor: QueryListAdaptor<any> = {
    parser: (resource: string, queryString?: Record<string,string>|null) => {
        const filter: QueryFilter[] = (queryString?.filter || '').split(',').map((f: string) => {
            const [field, value] = f.split(':');
            return {
                field,
                op: '=',
                value
            }
        });

        return {
            resource,
            filter,
            range: {
                limit: strToInt(queryString?.limit, 10),
                offset: strToInt(queryString?.offset, 0),    
            },
            sort: queryString?.sort ? [{ field: queryString?.sort.replace(/^\-/, ''), direction: queryString?.sort.startsWith('-') ? 'DESC' : 'ASC' }] : []
        };
    },

    response: (result: any, params: QueryListParam, name: string) => {
        return {
            body: result.data,
            headers: {
                [`X-Found-${name}`]: result.total
            }
        }
    },

    params: [],

    querySchema: object({
        filter: string().examples([`name:John`]),
        limit: string().examples([`20`]),
        offset: string().examples([`10`]),
        sort: string().examples([`name`, 'age', '-age']),
    }),
}

export default DefaultAdaptor;