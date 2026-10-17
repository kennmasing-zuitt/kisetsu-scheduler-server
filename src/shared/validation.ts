import { isValidObjectId } from 'mongoose';
import { z, type ZodType } from 'zod';
import { ValidationError } from './errors/AppError.js';

/**
 * GraphQL already enforces the *shape* of arguments (types, required fields).
 * Zod enforces the *rules* (trimming, min length, email format, ...).
 * Throws a VALIDATION_ERROR with the Zod issues in `extensions.details`.
 */
export function parseInput<T extends ZodType>(schema: T, input: unknown): z.output<T> {
    const result = schema.safeParse(input);
    if (!result.success) {
        throw new ValidationError('Invalid input', result.error.issues);
    }
    return result.data;
}

export const ObjectIdSchema = z.string().refine(isValidObjectId, { message: 'Invalid ID' });
