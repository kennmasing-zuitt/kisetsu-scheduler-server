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

    @Field(() => Boolean, { description: "The user's role requires two-factor sign-in" })
    twoFactorRequired!: boolean;
}

@ObjectType('LoginPayload', {
    description:
        'Either a session (`token` + `user`), or the next step: `twoFactorRequired` -> ' +
        '`loginTwoFactor(challengeToken, code)`; `twoFactorSetupRequired` -> ' +
        '`setupTwoFactor(challengeToken)` then `confirmTwoFactor(challengeToken, code)`.',
})
export class LoginPayloadObject {
    @Field(() => String, { nullable: true, description: 'Set when signed in' })
    token?: string | null;

    @Field(() => UserObject, { nullable: true, description: 'Set when signed in' })
    user?: UserObject | null;

    @Field(() => Boolean)
    twoFactorRequired!: boolean;

    @Field(() => Boolean, { description: 'The role requires 2FA and it is not set up yet' })
    twoFactorSetupRequired!: boolean;

    @Field(() => String, {
        nullable: true,
        description: 'Short-lived token for the next step (5 min for the code, 15 min for setup)',
    })
    challengeToken?: string | null;
}

@ObjectType('TwoFactorSetup', {
    description: 'Scan `qrDataUrl` (or type `secret`) in an authenticator app',
})
export class TwoFactorSetupObject {
    @Field(() => String, { description: 'Base32 secret, for typing in by hand' })
    secret!: string;

    @Field(() => String, { description: 'otpauth:// link' })
    otpauthUrl!: string;

    @Field(() => String, { description: 'QR code as a PNG data URL' })
    qrDataUrl!: string;
}

@ObjectType('TwoFactorEnabledPayload')
export class TwoFactorEnabledPayloadObject extends AuthPayloadObject {
    @Field(() => [String], { description: 'One-time recovery codes. Shown only now.' })
    recoveryCodes!: string[];
}
