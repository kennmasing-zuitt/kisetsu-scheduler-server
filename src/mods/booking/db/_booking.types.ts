import type { InferSchemaType, Types } from 'mongoose';
import type { MobileVerificationSchema } from './mobileVerification.model.js';

export type MobileVerification = InferSchemaType<typeof MobileVerificationSchema> & {
    _id: Types.ObjectId;
};

/** After an SMS code is sent */
export interface SetupCodeSent {
    /** "0917 *** 4567" */
    sentTo: string;
    expiresAt: Date;
    /** When another code may be requested */
    resendAfter: Date;
}

/** After the SMS code is right */
export interface SetupCodeVerified {
    setupToken: string;
    /** A new client: ask for their name before showing the QR code */
    needsName: boolean;
    firstName: string | null;
    /** They already had app sign-in (setting up again replaces the old phone) */
    hasApp: boolean;
}

export interface AppEnrollmentResult {
    setupToken: string;
    secret: string;
    otpauthUrl: string;
    qrDataUrl: string;
}

export interface ClientSessionResult {
    token: string;
    expiresAt: Date;
    clientId: string;
    firstName: string;
}

export interface PublicService {
    id: string;
    name: string;
    /** Lengths with their price on the requested date */
    options: { durationMin: number; price: number }[];
}

export interface PublicTherapist {
    id: string;
    name: string;
}

export interface Slot {
    start: Date;
    end: Date;
    /** Therapists free for the whole slot (in roster order) */
    therapistIds: string[];
}

export interface SlotQuery {
    date: string;
    serviceId: string;
    durationMin: number;
    therapistId?: string;
}

export interface AppointmentRequest {
    serviceId: string;
    durationMin: number;
    start: Date;
    /** Omitted = any therapist (the client didn't ask for one by name) */
    therapistId?: string;
}

export interface AppointmentConfirmation {
    bookingId: string;
    start: Date;
    end: Date;
    serviceName: string;
    durationMin: number;
    therapistName: string;
    /** List price on that date (promos are applied at the front desk) */
    price: number;
}
