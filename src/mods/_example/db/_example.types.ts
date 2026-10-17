import { InferSchemaType, Require_id } from 'mongoose';
import { ExampleModel, ExampleSchema } from './example.model.js';

export type Example = Require_id<InferSchemaType<typeof ExampleSchema>>;

export type ExampleDocument = InstanceType<typeof ExampleModel>;

export type CreateExampleData = Pick<Example, 'firstName' | 'lastName'>;

export type UpdateExampleData = Partial<Pick<Example, 'firstName' | 'lastName'>> & { _id: string };
