import { InferSchemaType, Require_id } from 'mongoose';
import { BookingModel, BookingSchema } from './booking.model.js';
import { RoomModel, RoomSchema } from './room.model.js';
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
}

export interface CreateBookingData extends BookingSlot {
    client: string;
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
