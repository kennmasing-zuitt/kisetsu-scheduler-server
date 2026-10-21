import { mongo } from 'mongoose';
import { ConflictError, NotFoundError } from '../../../../shared/errors/AppError.js';
import type { ClientWithStats, UpdateClientData } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { clientFullName } from './clientName.js';
import { withClientStats } from './withClientStats.js';

/**
 * Rename a client, change their mobile or notes. Bookings carry a copy of the name and mobile
 * for the calendar, so those are refreshed too.
 */
export async function updateClient(data: UpdateClientData): Promise<ClientWithStats> {
    let updated;
    try {
        updated = await ScheduleOperations.updateClient({
            _id: data._id,
            mobile: data.mobile,
            firstName: data.firstName,
            lastName: data.lastName,
            notes: data.notes,
        });
    } catch (err) {
        if (err instanceof mongo.MongoServerError && err.code === 11000) {
            throw new ConflictError(
                'Another client already has this mobile number',
                'CLIENT_MOBILE_TAKEN',
            );
        }
        throw err;
    }
    if (!updated) throw new NotFoundError('Client not found');

    if (data.mobile !== undefined || data.firstName !== undefined || data.lastName !== undefined) {
        await ScheduleOperations.syncClientOnBookings(String(updated._id), {
            name: clientFullName(updated),
            mobile: updated.mobile,
        });
    }
    const [withStats] = await withClientStats([updated]);
    return withStats;
}
