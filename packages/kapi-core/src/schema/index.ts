import {mayi} from '../acl';
import {IACLActor} from '../types/acl';

import {ErrorToHttp} from '../types/http';
import {getFlags} from './quick';
import Debug from 'debug';
import {AnyObjectSchema, object, addMethod, Schema, ValidationError} from 'yup';
import {
  SchemaFlags,
  SchemaViewTransform,
  ValidateAction,
} from '../types/schema';
import {IDataRecord, TypeID} from '../types/common';

import { extendSchema } from '@sodaru/yup-to-json-schema';

extendSchema({ addMethod, Schema });

const debug = Debug('kapi:core:schema');

export {helpers} from './quick';

export default class ResourceSchema {
  createSchema: Schema;
  replaceSchema: Schema;
  updateSchema: Schema;
  viewSchema: Schema;

  yup: AnyObjectSchema;

  viewTransforms: Record<
    string,
    SchemaViewTransform | boolean | string | undefined
  > = {};
  flags: Record<string, SchemaFlags> = {};

  constructor(schema: AnyObjectSchema) {
    if (!('id' in schema.fields)) {
      throw new Error("Invalid schema: Missing 'id' field");
    }

    this.yup = schema;

    const createFields: Record<string, Schema> = {};
    const replaceFields: Record<string, Schema> = {};
    const updateFields: Record<string, Schema> = {};
    const viewFields: Record<string, Schema> = {};

    Object.keys(schema.fields).forEach(fieldName => {
      const field = schema.fields[fieldName] as Schema;

      // console.log('Field', field, fieldName);

      this.flags[fieldName] = getFlags(field.describe());
      const {$create, $replace, $update, $view, $virtual} =
        this.flags[fieldName];

      if ($create !== false) {
        createFields[fieldName] = field.clone().meta({
          ...this.flags[fieldName],
          description: this.makeDescription($create),
        });
      }
      if ($replace !== false) {
        replaceFields[fieldName] = field.clone().meta({
          ...this.flags[fieldName],
          description: this.makeDescription($replace),
        });
      }
      if ($update !== false) {
        updateFields[fieldName] = field
          .clone()
          .optional()
          .meta({
            ...this.flags[fieldName],
            description: this.makeDescription($update),
          });
      }
      if ($view !== false) {
        viewFields[fieldName] = field
          .clone()
          .optional()
          .meta({
            ...this.flags[fieldName],
            description: this.makeDescription($view),
          });
        this.viewTransforms[fieldName] = $virtual ? false : $view;
      }
    });

    this.createSchema = object(createFields).noUnknown();
    this.replaceSchema = object(replaceFields).noUnknown();
    this.updateSchema = object(updateFields).noUnknown();
    this.viewSchema = object(viewFields).noUnknown();
  }

  makeDescription(
    $perm: string | boolean | SchemaViewTransform | undefined,
  ): string {
    return typeof $perm === 'string' ? `#permission(${$perm})` : '';
  }

  async validate<T>(
    action: ValidateAction,
    data: T,
    actor: IACLActor | null,
    updatingId?: TypeID,
  ): Promise<T> {
    let pass = true;
    const errors: Record<string, string> = {};

    // this.checkPermission(actor, action);

    switch (action) {
      case 'create':
        try {
          data = await this.createSchema!.validate(data, {
            abortEarly: false,
            stripUnknown: true,
          });
        } catch (e) {
          pass = false;
          (e as ValidationError).inner.forEach(error => {
            errors[error.path!] = error.message;
          });
        }
        break;

      case 'replace':
        try {
          data = await this.replaceSchema!.validate(data, {
            abortEarly: false,
            stripUnknown: true,
          });
        } catch (e) {
          pass = false;
          (e as ValidationError).inner.forEach(error => {
            errors[error.path!] = error.message;
          });
        }
        break;

      case 'update':
        try {
          data = await this.updateSchema!.validate(data, {
            abortEarly: false,
            stripUnknown: true,
          });
        } catch (e) {
          pass = false;
          (e as ValidationError).inner.forEach(error => {
            errors[error.path!] = error.message;
          });
        }
        break;

      case 'view': // should we?
        try {
          data = await this.viewSchema!.validate(data, {
            abortEarly: false,
            stripUnknown: true,
          });
        } catch (e) {
          pass = false;
          (e as ValidationError).inner.forEach(error => {
            errors[error.path!] = error.message;
          });
        }
        break;
    }

    if (!pass) {
      debug('Validation failed', JSON.stringify(errors), JSON.stringify(data));
      // if (errors) {
      throw new ErrorToHttp('Validate failed', 400, {
        message: 'Invalid input',
        errors,
      });
      // }
    }

    const output: IDataRecord = {id: updatingId || (data as IDataRecord).id};
    const fieldNames = Object.keys(data as Object);

    await Promise.all(
      fieldNames.map(async fname => {
        const {$virtual, $create, $update, $replace, $view} = this.flags[fname];

        const flags = {
          $create,
          $update,
          $view,
          $replace,
        };

        if (!this.flags[fname]) {
          throw new ErrorToHttp(`Unknown field ${fname}`, 400, true);
        }

        if (flags[`$${action}`] === false) {
          throw new ErrorToHttp(
            `Field ${fname} not allowed to ${action}.`,
            403,
            true,
          );
        }

        if (typeof flags[`$${action}`] === 'string') {
          const permission = flags[`$${action}`] as string;
          if (!mayi(actor, permission)) {
            throw new ErrorToHttp(
              `Permission denied to ${action} "${fname}".`,
              403,
              true,
            );
          }
        }

        const patch: Record<string, unknown> = $virtual
          ? {}
          : {[fname]: (data as IDataRecord)[fname]};

        Object.keys(patch).forEach(k => {
          output[k] = patch[k];
        });
      }),
    );

    return output as T;
  }
}
