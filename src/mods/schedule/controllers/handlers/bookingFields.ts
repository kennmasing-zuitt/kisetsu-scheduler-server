import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import type { Booking } from '../../db/_schedule.types.js';
import { BookingObject } from '../../dto/booking.dto.js';

/** Computed fields of the `Booking` type. */
@Resolver(() => BookingObject)
export class BookingFieldsHandler {
    // Impl functions return Mongoose documents or .lean() objects, which carry `_id`
    @FieldResolver(() => ID)
    id(@Root() doc: Booking): string {
        return String(doc._id);
    }

    // Stored as ObjectIds; exposed as plain ID strings
    @FieldResolver(() => ID)
    therapistId(@Root() doc: Booking): string {
        return String(doc.therapistId);
    }

    @FieldResolver(() => ID)
    roomId(@Root() doc: Booking): string {
        return String(doc.roomId);
    }

    @FieldResolver(() => ID, { nullable: true })
    serviceId(@Root() doc: Booking): string | null {
        return doc.serviceId ? String(doc.serviceId) : null;
    }
}
