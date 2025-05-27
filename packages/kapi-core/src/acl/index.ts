import {IACLActor} from '../types/acl';

export function mayi(
  actor: IACLActor | null,
  action: string | Array<string>,
): boolean {
  if (!actor || !actor.permissions || !action) {
    return false;
  }

  if (!Array.isArray(action)) {
    return actor.permissions.includes(action.toLowerCase());
  }

  return action.reduce((passed, act) => {
    return passed || actor.permissions.includes(act.toLowerCase());
  }, false);
}
