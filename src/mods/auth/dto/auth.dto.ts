import { Field, ID, InputType, ObjectType } from 'type-graphql';
import { Permission } from '../../roles/index.js';
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

@ObjectType('ImpersonationPayload', {
    description:
        'A short-lived token that acts as `user`. Send it as `Authorization: Bearer <token>`.',
})
export class ImpersonationPayloadObject {
    @Field(() => String)
    token!: string;

    @Field(() => Date)
    expiresAt!: Date;

    @Field(() => UserObject, { description: 'The impersonated user' })
    user!: UserObject;

    @Field(() => ID, { description: 'The admin who started the session' })
    impersonatedBy!: string;
}

@ObjectType('Session', { description: 'Who the current token belongs to and what it can do' })
export class SessionObject {
    @Field(() => UserObject)
    user!: UserObject;

    @Field(() => [Permission], {
        description: 'Permissions that actually apply (all of them for a super admin)',
    })
    effectivePerms!: Permission[];

    @Field(() => UserObject, {
        nullable: true,
        description: 'Set when an admin is impersonating this user: show a banner in the UI',
    })
    impersonatedBy?: UserObject | null;
}
