import type { InferSchemaType, Types } from 'mongoose';
import type { Permission } from '../../roles/index.js';
import type { UserModel, UserSchema } from './user.model.js';

// Stored shape (includes createdAt/updatedAt from `timestamps: true`)
export type User = Omit<InferSchemaType<typeof UserSchema>, 'extraPerms'> & {
    _id: Types.ObjectId;
    extraPerms: Permission[];
};

// What queries return: User + _id + methods like comparePassword
export type UserDocument = InstanceType<typeof UserModel>;

// Input for operations.create; the password is already hashed by AuthImpl.register
export type CreateUserData = Pick<User, 'name' | 'email' | 'password'>;

// A user as exposed to the API. The GraphQL `User` type has no password field at all.
export type PublicUser = Omit<User, 'password'>;
