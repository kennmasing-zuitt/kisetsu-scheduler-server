import { InferSchemaType, Types } from 'mongoose';
import { UserModel, UserSchema } from './user.model.js';

// Stored shape (includes createdAt/updatedAt from `timestamps: true`)
export type User = InferSchemaType<typeof UserSchema> & {
    _id: Types.ObjectId;
};

// What queries return: User + _id + methods like comparePassword
export type UserDocument = InstanceType<typeof UserModel>;

// One entry in user.roles
export type UserRole = User['roles'][number];

// Input for operations.create; the password is already hashed by AuthImpl.register
export type CreateUserData = Pick<User, 'name' | 'email' | 'password'>;

// A user as exposed to the API. The GraphQL `User` type has no password field at all.
export type PublicUser = Omit<User, 'password'>;
