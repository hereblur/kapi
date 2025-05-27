import SimpleKnexConnection from '@kapi/knex';
import { IDatabaseModel, SchemaHelpers as sch } from '@kapi/core';
import connection from '../db';
import { InferType, object } from 'yup';


// Define schema
export const PhotoSchema = object().shape({
    id: sch.integer({ $update: false, $create: false}).required(),
    url: sch.string().required(),
    revision: sch.integer().required(),
})

//  Declare defined schema as type
export type Photo = InferType<typeof PhotoSchema>;

// Using SimpleKnexConnection helper to generate functions
// theses are CRUD functions for the model.
// They are auto generated.

const { create, update: updateOriginal, list, get } = SimpleKnexConnection<Photo>(connection, {
  searchFields: [],
}, 'photos');

// You can override/wrap model function to suit your need.
async function update(id: string, patch: Partial<Photo>) {

  const before = await get!(id);
  before.revision += 1;
  patch = { ...patch, revision: before.revision };

  return await updateOriginal!(id, patch);
} 

// You can skip some function if you don't need them. and its wont generate rest endpoints(404 returned).
export default { create, update, /*list, */ get } as IDatabaseModel<Photo>