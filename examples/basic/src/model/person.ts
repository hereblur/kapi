import SimpleKnexConnection from '@kapi/knex';
import { IDatabaseModel, SchemaHelpers as sch } from '@kapi/core';
import connection from '../db';
import { InferType, object } from 'yup';


// Define schema
export const PersonSchema = object().shape({
    id: sch.integer({ $update: false, $create: false}).required(),
    name: sch.string().required(),
    age: sch.integer().required(),
    nickname: sch.string({}),
    secret: sch.string({ $view: false }).required(),
})


//  Declare defined schema as type
export type Person = InferType<typeof PersonSchema>;


// Using SimpleKnexConnection helper to generate functions
// theses are CRUD functions for the model.
// They are auto generated.

const { create, update, list, get } = SimpleKnexConnection(connection, {
  searchFields: [],
}, 'persons');

// Exporting functions as a database model 
export default { create, update, list, get } as IDatabaseModel<Person>