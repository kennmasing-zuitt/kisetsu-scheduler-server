import { InferSchemaType, model, Schema } from 'mongoose';

export const BookingSchema = new Schema(
    {
        /** Who the booking is for (free text: walk-ins don't have accounts) */
        client: { type: String, required: true, trim: true },
        therapistId: { type: Schema.Types.ObjectId, ref: 'Therapist', required: true },
        roomId: { type: Schema.Types.ObjectId, ref: 'Room', required: true },
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

export type BookingSchemaType = InferSchemaType<typeof BookingSchema>;
export const BookingModel = model('Booking', BookingSchema);
