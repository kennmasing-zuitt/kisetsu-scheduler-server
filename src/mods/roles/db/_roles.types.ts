import type { InferSchemaType, Types } from 'mongoose';
import type { Permission, RoleKind } from './_roles.enum.js';
import type { RoleSchema } from './role.model.js';

export type Role = Omit<InferSchemaType<typeof RoleSchema>, 'kind' | 'perms'> & {
    _id: Types.ObjectId;
    kind: RoleKind;
    perms: Permission[];
};

export interface CreateRoleData {
    key: string;
    name: string;
    description?: string;
    kind: RoleKind;
    perms: Permission[];
    isSystem?: boolean;
}

export type UpdateRoleData = Partial<Pick<CreateRoleData, 'name' | 'description' | 'perms'>>;
