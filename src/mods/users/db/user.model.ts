import { model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLE_KEY_VALUES, RoleKey } from './_users.enum.js';

const UserRoleSchema = new Schema({
    key: {
        type: String,
        required: true,
        enum: ROLE_KEY_VALUES,
        default: RoleKey.user,
    },
});

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
        roles: {
            type: [UserRoleSchema],
            default: () => [{ key: RoleKey.user }],
        },
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
