import type { BookingSource } from './_schedule.enum.js';
import { InferSchemaType, Require_id } from 'mongoose';
import { DiscountType } from './_schedule.enum.js';
import { BookingModel, BookingSchema } from './booking.model.js';
import { ClientModel, ClientSchema } from './client.model.js';
import { PromoModel, PromoSchema } from './promo.model.js';
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

/** Who the booking is for: the mobile picks (or creates) the Client record */
export interface ClientRef {
    /** Canonical form, already normalised */
    clientMobile: string;
    /** Used only when the mobile is new (a new client is created) */
    clientFirstName?: string;
    clientLastName?: string;
}

export interface CreateBookingData extends BookingSlot, ClientRef {
    serviceId: string;
    isRequested: boolean;
    /** Promo code as typed (case doesn't matter) */
    promoCode?: string;
    createdBy?: string;
    /** Defaults to staff */
    source?: BookingSource;
}

/** `promoCode: ""` removes the promo; a missing field leaves things as they are */
export type UpdateBookingData = Partial<
    BookingSlot & ClientRef & { isRequested: boolean; promoCode: string }
> & { _id: string };

/** What is stored for a new booking */
export interface NewBookingRecord {
    client: string;
    clientId: string;
    clientMobile: string;
    therapistId: string;
    roomId: string;
    serviceId: string;
    isRequested: boolean;
    promoId: string | null;
    promoCode: string | null;
    start: Date;
    end: Date;
    createdBy?: string;
    source?: BookingSource;
}

/** Stored fields an update may change (undefined = unchanged; promo null = removed) */
export type BookingRecordPatch = Partial<Omit<NewBookingRecord, 'createdBy' | 'source'>> & {
    _id: string;
};

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

// ---------- Clients ----------
export type Client = Require_id<InferSchemaType<typeof ClientSchema>>;

export type ClientDocument = InstanceType<typeof ClientModel>;

export interface ClientData {
    mobile: string;
    firstName: string;
    lastName: string;
    notes: string;
}

export type UpdateClientData = Partial<ClientData> & { _id: string };

export interface ClientSearch {
    search?: string;
    page: number;
    limit: number;
}

/** Counted from bookings. A visit is a booking that has ended (the service was rendered). */
export interface ClientStats {
    visits: number;
    upcoming: number;
    /** Earliest booking of any kind (used to spot new clients in reports) */
    firstBooking: Date | null;
    firstVisit: Date | null;
    lastVisit: Date | null;
    /** Visits where the client asked for the therapist by name */
    requested: number;
    /** The therapist the client has seen most */
    favouriteTherapistId: string | null;
    favouriteTherapistName: string | null;
}

export type ClientWithStats = Client & { stats: ClientStats };

// ---------- Promos ----------
export type Promo = Require_id<InferSchemaType<typeof PromoSchema>>;

export type PromoDocument = InstanceType<typeof PromoModel>;

export interface PromoData {
    code: string;
    description: string;
    discountType: DiscountType;
    value: number;
    validFrom: string;
    validTo: string | null;
    serviceIds: string[];
    isActive: boolean;
}

export type UpdatePromoData = Partial<PromoData> & { _id: string };

/** A promo with how many bookings used it (used promos have locked terms) */
export type PromoWithUsage = Promo & { timesUsed: number };

/** What a promo discount is computed from */
export interface PromoTerms {
    discountType: DiscountType | string;
    value: number;
}
