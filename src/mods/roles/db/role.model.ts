import { model, Schema } from 'mongoose';
import { PERMISSION_VALUES, ROLE_KIND_VALUES } from './_roles.enum.js';

export const RoleSchema = new Schema(
    {
        // Stable identifier users reference (user.role). Immutable once created.
        key: { type: String, required: true, unique: true, lowercase: true, trim: true },
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true, default: '' },
        kind: { type: String, required: true, enum: ROLE_KIND_VALUES },
        perms: { type: [String], enum: PERMISSION_VALUES, default: [] },
        // System roles are created on startup and can't be deleted (super-admin is fully locked)
        isSystem: { type: Boolean, default: false },
    },
    { collection: 'Role', timestamps: true },
);

export const RoleModel = model('Role', RoleSchema);
