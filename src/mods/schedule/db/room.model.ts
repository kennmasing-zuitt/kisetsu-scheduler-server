import { InferSchemaType, model, Schema } from 'mongoose';

export const RoomSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        /** Hex color "#RRGGBB" used for the room's bookings on the calendar */
        color: { type: String, required: true, trim: true },
    },
    {
        collection: 'Room',
        timestamps: true,
        toJSON: { virtuals: true, versionKey: false },
    },
);

export type RoomSchemaType = InferSchemaType<typeof RoomSchema>;
export const RoomModel = model('Room', RoomSchema);
