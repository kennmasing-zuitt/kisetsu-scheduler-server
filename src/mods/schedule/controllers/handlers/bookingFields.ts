import { FieldResolver, ID, Resolver, Root } from 'type-graphql';
import { BookingSource, BookingStatus } from '../../db/_schedule.enum.js';
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

    @FieldResolver(() => ID, { nullable: true })
    clientId(@Root() doc: Booking): string | null {
        return doc.clientId ? String(doc.clientId) : null;
    }

    @FieldResolver(() => ID, { nullable: true })
    promoId(@Root() doc: Booking): string | null {
        return doc.promoId ? String(doc.promoId) : null;
    }

    // Bookings made before this field existed have none
    @FieldResolver(() => Boolean)
    isRequested(@Root() doc: Booking): boolean {
        return Boolean(doc.isRequested);
    }

    @FieldResolver(() => BookingStatus)
    status(@Root() doc: Booking): BookingStatus {
        return (doc.status as BookingStatus | undefined) ?? BookingStatus.booked;
    }

    @FieldResolver(() => BookingSource)
    source(@Root() doc: Booking): BookingSource {
        return (doc.source as BookingSource | undefined) ?? BookingSource.staff;
    }
}
