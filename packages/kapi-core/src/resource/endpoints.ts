import {object, string} from 'yup';
// import {ExtendedPropertiesSchema} from '../schema/types';

export const endpointWithIDSchema = object().shape({
  id: string().required(),
});

// export const listQuerySchema = object();
