import { model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { DEFAULT_ROLE_KEY, PERMISSION_VALUES } from '../../roles/index.js';

export const UserSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        // select: false -> never loaded unless a query asks for '+password'
        password: { type: String, required: true, select: false },
        // Key of a Role document (see mods/roles). The role carries the permissions.
        role: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            default: DEFAULT_ROLE_KEY,
            index: true,
        },
        // Per-user grants on top of the role's permissions (admin permissions only apply to
        // users with an admin-kind role). Checked on every request, so changes apply immediately.
        extraPerms: { type: [String], enum: PERMISSION_VALUES, default: [] },
        // Copied into every access token as `ver`. Incrementing it (logout, password change)
        // revokes every token issued before, on every device.
        tokenVersion: { type: Number, default: 0 },
    },
    {
        collection: 'User',
        timestamps: true,
        toJSON: {
            virtuals: true, // adds `id`
            versionKey: false, // drops `__v`
            transform: (_doc, ret: Record<string, unknown>) => {
                const { password: _password, ...rest } = ret; // never leaks if serialized
                return rest;
            },
        },
        methods: {
            // Requires the document to be loaded with .select('+password')
            comparePassword(candidate: string) {
                return bcrypt.compare(candidate, this.password);
            },
        },
    },
);

export const UserModel = model('User', UserSchema);
