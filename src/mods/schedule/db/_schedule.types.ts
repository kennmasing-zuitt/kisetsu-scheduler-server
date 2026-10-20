import { InferSchemaType, Require_id } from 'mongoose';
import { BookingModel, BookingSchema } from './booking.model.js';
import { RoomModel, RoomSchema } from './room.model.js';
import { ServiceModel, ServiceSchema } from './service.model.js';
import { TherapistModel, TherapistSchema } from './therapist.model.js';

// ---------- Therapists ----------
export type Therapist = Require_id<InferSchemaType<typeof TherapistSchema>>;

export type TherapistDocument = InstanceType<typeof TherapistModel>;

export interface CreateTherapistData {
    name: string;
    offDays: number[];
    leaveDates: string[];
}

export type UpdateTherapistData = Partial<CreateTherapistData> & { _id: string };

// ---------- Rooms ----------
export type Room = Require_id<InferSchemaType<typeof RoomSchema>>;

export type RoomDocument = InstanceType<typeof RoomModel>;

export type CreateRoomData = Pick<Room, 'name' | 'color'>;

export type UpdateRoomData = Partial<Pick<Room, 'name' | 'color'>> & { _id: string };

// ---------- Bookings ----------
export type Booking = Require_id<InferSchemaType<typeof BookingSchema>>;

export type BookingDocument = InstanceType<typeof BookingModel>;

/** Who, where and when: everything the scheduling rules look at. */
export interface BookingSlot {
    therapistId: string;
    roomId: string;
    start: Date;
    end: Date;
    /** Required for new bookings; older bookings may not have one */
    serviceId?: string;
}

export interface CreateBookingData extends BookingSlot {
    client: string;
    serviceId: string;
    createdBy?: string;
}

export type UpdateBookingData = Partial<BookingSlot & { client: string }> & { _id: string };

/** Bookings overlapping [from, to), optionally for one therapist or room. */
export interface BookingRange {
    from: Date;
    to: Date;
    therapistId?: string;
    roomId?: string;
}

export interface OverlapQuery {
    start: Date;
    end: Date;
    therapistId?: string;
    roomId?: string;
    /** Leave this booking out (the one being edited) */
    excludeId?: string;
}

export interface UpcomingQuery {
    therapistId?: string;
    roomId?: string;
    /** Bookings ending after this instant count as upcoming */
    after: Date;
}

// ---------- Services ----------
export type Service = Require_id<InferSchemaType<typeof ServiceSchema>>;

export type ServiceDocument = InstanceType<typeof ServiceModel>;

/** A price rule as written by clients (see db/service.model.ts for the meaning of each field) */
export interface ServicePriceData {
    durationMin: number | null;
    days: number[];
    amount: number;
    validFrom: string;
    validTo: string | null;
}

/** A stored price rule, as read back (lean documents may leave defaults undefined) */
export interface ServicePriceRule {
    durationMin?: number | null;
    days?: number[];
    amount: number;
    validFrom: string;
    validTo?: string | null;
}

export interface CreateServiceData {
    name: string;
    description: string;
    isActive: boolean;
    prices: ServicePriceData[];
}

export type UpdateServiceData = Partial<CreateServiceData> & { _id: string };

/** What a booking is priced by: its local date, weekday and length */
export interface PriceQuery {
    dateKey: string;
    weekday: number;
    durationMin: number;
}
