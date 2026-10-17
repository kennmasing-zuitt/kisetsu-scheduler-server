import { mongo } from 'mongoose';
import type { AuthUser } from '../../../../shared/auth/auth.types.js';
import { ConflictError } from '../../../../shared/errors/AppError.js';
import { AuditAction, AuditImpl, type AuditMeta } from '../../../audit/index.js';
import type { Role } from '../../db/_roles.types.js';
import * as RolesOperations from '../../db/repository/index.js';
import type { CreateRoleInput } from '../../db/role.zod.js';
import { assertCanManageRole } from './assertCanManageRole.js';

const keyTaken = (key: string) =>
    new ConflictError(`Role "${key}" already exists`, 'ROLE_KEY_TAKEN');

export const createRole = async (
    actor: AuthUser,
    input: CreateRoleInput,
    meta: AuditMeta,
): Promise<Role> => {
    assertCanManageRole(actor, input.kind, input.perms);
    if (await RolesOperations.findRoleByKey(input.key)) throw keyTaken(input.key);

    let role: Role;
    try {
        role = await RolesOperations.createRole({ ...input, isSystem: false });
    } catch (err) {
        if (err instanceof mongo.MongoServerError && err.code === 11000) throw keyTaken(input.key);
        throw err;
    }
    await AuditImpl.recordAudit(meta, {
        action: AuditAction.roleCreated,
        details: { role: input.key, kind: input.kind, perms: input.perms },
    });
    return role;
};
