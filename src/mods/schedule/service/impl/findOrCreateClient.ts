import { mongo } from 'mongoose';
import { ValidationError } from '../../../../shared/errors/AppError.js';
import type { Client, ClientRef } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';

/**
 * The client with this mobile, created on the spot when the number is new. An existing client
 * keeps the name on file (rename them on the Clients page). Safe when two bookings for the
 * same new number arrive at once: the unique index rejects the second insert, which then reads
 * the client the first one created.
 */
export async function findOrCreateClient({
    clientMobile,
    clientFirstName,
    clientLastName,
}: ClientRef): Promise<Pick<Client, '_id' | 'mobile' | 'firstName' | 'lastName'>> {
    const existing = await ScheduleOperations.findClientByMobile(clientMobile);
    if (existing) return existing;

    if (!clientFirstName) {
        throw new ValidationError('Enter the first name: this mobile number is a new client', [
            { path: ['clientFirstName'], message: 'Required for a new client' },
        ]);
    }
    try {
        return await ScheduleOperations.createClient({
            mobile: clientMobile,
            firstName: clientFirstName,
            lastName: clientLastName ?? '',
            notes: '',
        });
    } catch (err) {
        if (err instanceof mongo.MongoServerError && err.code === 11000) {
            const raced = await ScheduleOperations.findClientByMobile(clientMobile);
            if (raced) return raced;
        }
        throw err;
    }
}
