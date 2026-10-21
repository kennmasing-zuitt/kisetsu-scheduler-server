import { Field, ID, Int, ObjectType, registerEnumType } from 'type-graphql';
import { SmsPurpose, SmsStatus } from '../db/_sms.enum.js';

registerEnumType(SmsPurpose, { name: 'SmsPurpose' });
registerEnumType(SmsStatus, { name: 'SmsStatus' });
export { SmsPurpose, SmsStatus };

@ObjectType('SmsLog', { description: 'An outgoing text message and its delivery result' })
export class SmsLogObject {
    @Field(() => ID)
    id!: string;

    @Field(() => String, { description: 'E.164 mobile number' })
    to!: string;

    @Field(() => SmsPurpose)
    purpose!: SmsPurpose;

    @Field(() => String, { description: 'The text, with any code masked' })
    message!: string;

    @Field(() => ID, { nullable: true })
    clientId?: string | null;

    @Field(() => ID, { nullable: true })
    bookingId?: string | null;

    @Field(() => SmsStatus)
    status!: SmsStatus;

    @Field(() => Int)
    attempts!: number;

    @Field(() => String)
    provider!: string;

    @Field(() => String, { nullable: true })
    error?: string | null;

    @Field(() => Date, { nullable: true })
    sentAt?: Date | null;

    @Field(() => Date)
    createdAt!: Date;
}
