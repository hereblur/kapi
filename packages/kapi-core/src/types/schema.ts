import {IACLActor} from './acl';
import {Schema} from 'yup';

export interface BaseSchema {
  [key: string]: Schema;
}

export type SchemaViewTransform = (
  value: unknown,
  actor?: IACLActor,
  record?: Record<string, unknown>,
) => unknown;

export type ValidateAction = 'create' | 'update' | 'view' | 'replace';

export interface SchemaFlags {
  $virtual?: boolean;
  $create?: boolean | string;
  $update?: boolean | string;
  $replace?: boolean | string;
  $view?: boolean | string | SchemaViewTransform;
  $required?: boolean;
  // $allowedEmpty?: boolean;
}

export type PermissionMap = {
  [action in ValidateAction | 'delete']?: string | string[];
};
