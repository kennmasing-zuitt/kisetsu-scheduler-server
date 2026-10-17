import { Field, InputType, ObjectType } from 'type-graphql';
import { UserObject } from '../../users/index.js';

// GraphQL shapes only; the rules (trim, lowercase, email format, 8-72 chars, new != current)
// live in users/db/zod/auth.zod.ts

@InputType('RegisterInput')
export class RegisterInputType {
    @Field(() => String)
    name!: string;

    @Field(() => String, { description: 'Normalised to lowercase' })
    email!: string;

    @Field(() => String, { description: '8-72 characters' })
    password!: string;
}

@InputType('LoginInput')
export class LoginInputType {
    @Field(() => String)
    email!: string;

    @Field(() => String)
    password!: string;
}

@InputType('ChangePasswordInput')
export class ChangePasswordInputType {
    @Field(() => String)
    currentPassword!: string;

    @Field(() => String, { description: '8-72 characters, different from the current one' })
    newPassword!: string;
}

@ObjectType('AuthPayload', {
    description: 'Send the token as `Authorization: Bearer <token>` on later requests',
})
export class AuthPayloadObject {
    @Field(() => String, { description: 'JWT access token (HS256), expires after JWT_EXPIRES_IN' })
    token!: string;

    @Field(() => UserObject)
    user!: UserObject;
}

@ObjectType('RegisterPayload')
export class RegisterPayloadObject extends AuthPayloadObject {
    @Field(() => String)
    message!: string;
}
