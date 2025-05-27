import { Resource } from '@kapi/core';
import PersonModel, { Person, PersonSchema } from '../model/person';

// This is where we create rest-resource for our model.
// this will wrap the model functions and create rest endpoints

export const PersonResource = new Resource<Person>('person', PersonSchema);
PersonResource.model = PersonModel;
