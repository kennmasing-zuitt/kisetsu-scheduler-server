import { Field, InputType, ObjectType } from 'type-graphql';
import { UserObject } from '../../users/index.js';

// Shape only; the rules (trim, lowercase, email format, 8-72 chars) are in users/db/zod/auth.zod.ts
@InputType('RegisterInput')
export class RegisterInputType {
    @Field(() => String)
    name!: string;

    @Field(() => String, { description: 'Normalised to lowercase' })
    email!: string;

    @Field(() => String, { description: '8-72 characters' })
    password!: string;
}

@ObjectType('RegisterPayload')
export class RegisterPayloadObject {
    @Field(() => String)
    message!: string;

    @Field(() => UserObject)
    user!: UserObject;
}
