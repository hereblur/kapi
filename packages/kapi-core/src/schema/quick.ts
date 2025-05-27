import * as yup from 'yup';
import {SchemaFlags} from '../types/schema';

export const getFlags = (schema: yup.SchemaFieldDescription): SchemaFlags => {
  if (!('meta' in schema)) {
    return {};
  }

  const {$virtual, $create, $replace, $update, $view} = schema?.meta || {};

  return {
    $virtual,
    $create,
    $replace,
    $update,
    $view,
  };
};

export const helpers = {
  string(flags: SchemaFlags = {}): yup.Schema {
    return yup.string().max(255).meta(flags);
  },

  text(flags: SchemaFlags = {}): yup.Schema {
    return yup.string().trim().meta(flags);
  },

  integer(flags: SchemaFlags = {}): yup.Schema {
    //return {...helperTypes('integer', flags)};
    return yup.number().integer().meta(flags);
  },

  number(flags: SchemaFlags = {}): yup.Schema {
    return yup.number().meta(flags);
  },


  dateTime(flags: SchemaFlags = {}): yup.Schema {
    // YYYY-MM-DD HH:mm:ss
    return yup
      .string()
      .trim()
      .matches(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
      .meta(flags);
  },

  boolean(flags: SchemaFlags = {}): yup.Schema {
    return yup.boolean().meta(flags);
  },

  email(flags: SchemaFlags = {}): yup.Schema {
    return yup.string().email().meta(flags);
  },

  url(flags: SchemaFlags = {}): yup.Schema {
    return yup.string().url().meta(flags);
  },

  uri(flags: SchemaFlags = {}): yup.Schema {
    return yup.string().url().meta(flags);
  },

  enum(enumValues: Array<string>, flags: SchemaFlags = {}): yup.Schema {
    return yup.string().oneOf(enumValues).meta(flags);
  },
};
