import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { SmsLogDocument } from '../../db/_sms.types.js';
import { SmsLogObject } from '../../dto/sms.dto.js';

@Resolver(() => SmsLogObject)
export class SmsLogFieldsHandler {
    @FieldResolver(() => ID)
    id(@Root() doc: SmsLogDocument): string {
        return String(doc._id);
    }

    @FieldResolver(() => ID, { nullable: true })
    clientId(@Root() doc: SmsLogDocument): string | null {
        return doc.clientId ? String(doc.clientId) : null;
    }

    @FieldResolver(() => ID, { nullable: true })
    bookingId(@Root() doc: SmsLogDocument): string | null {
        return doc.bookingId ? String(doc.bookingId) : null;
    }
}
