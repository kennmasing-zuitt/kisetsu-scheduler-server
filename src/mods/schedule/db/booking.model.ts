import { InferSchemaType, model, Schema } from 'mongoose';

export const BookingSchema = new Schema(
    {
        /** The client's name as shown on the calendar (kept in sync with the Client record) */
        client: { type: String, required: true, trim: true },
        /** The client (by mobile). Bookings made before clients existed have none */
        clientId: { type: Schema.Types.ObjectId, ref: 'Client' },
        /** The client's mobile, canonical form (kept in sync with the Client record) */
        clientMobile: { type: String, trim: true },
        /** The client asked for this therapist by name */
        isRequested: { type: Boolean, default: false },
        /** Promo applied (one per booking); the discount is computed by reports */
        promoId: { type: Schema.Types.ObjectId, ref: 'Promo', default: null },
        /** The promo's code, kept for display */
        promoCode: { type: String, default: null },
        therapistId: { type: Schema.Types.ObjectId, ref: 'Therapist', required: true },
        roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
        /** What was booked; priced in reports by the service's rule for the booking's date.
         *  Not required at the schema level: bookings made before services existed have none. */
        serviceId: { type: Schema.Types.ObjectId, ref: 'Service' },
        start: { type: Date, required: true },
        end: { type: Date, required: true },
        /** The user who made the booking */
        createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    {
        collection: 'Booking',
        timestamps: true,
        toJSON: { virtuals: true, versionKey: false },
    },
);

// Range reads (calendar view) and the overlap checks per therapist / per room
BookingSchema.index({ start: 1, end: 1 });
BookingSchema.index({ therapistId: 1, start: 1 });
BookingSchema.index({ roomId: 1, start: 1 });
BookingSchema.index({ serviceId: 1 });
BookingSchema.index({ clientId: 1, start: 1 });
BookingSchema.index({ promoId: 1 });

export type BookingSchemaType = InferSchemaType<typeof BookingSchema>;
export const BookingModel = model('Booking', BookingSchema);
