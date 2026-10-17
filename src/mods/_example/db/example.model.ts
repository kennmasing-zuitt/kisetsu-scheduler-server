import { InferSchemaType, model, Schema } from 'mongoose';

export const ExampleSchema = new Schema(
    {
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
    },
    {
        collection: 'Example',
        timestamps: true,
        toJSON: { virtuals: true, versionKey: false },
    },
);

export type ExampleSchemaType = InferSchemaType<typeof ExampleSchema>;
export const ExampleModel = model('Example', ExampleSchema);
