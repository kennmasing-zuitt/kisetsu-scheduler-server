import { ConflictError, NotFoundError } from '../../../../shared/errors/AppError.js';
import * as ScheduleOperations from '../../db/repository/index.js';

/**
 * Deletes a service that was never booked. Once a booking uses it, reports depend on it, so
 * deleting is refused (SERVICE_IN_USE): archive it instead (updateService isActive: false).
 */
export const deleteService = async (_id: string): Promise<boolean> => {
    const service = await ScheduleOperations.findServiceById(_id);
    if (!service) throw new NotFoundError('Service not found');

    const used = await ScheduleOperations.countBookingsForService(_id);
    if (used > 0) {
        throw new ConflictError(
            `${service.name} is used by ${used} booking${used === 1 ? '' : 's'}, so reports need ` +
                'it. Archive it instead (it will no longer be offered for new bookings).',
            'SERVICE_IN_USE',
            { bookings: used },
        );
    }

    const deleted = await ScheduleOperations.deleteService(_id);
    if (!deleted) throw new NotFoundError('Service not found');
    return true;
};
