import { ConflictError, NotFoundError } from '../../../../shared/errors/AppError.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { findPromo } from './findPromo.js';

/** Deletes a promo no booking used; a used one can only be archived (PROMO_IN_USE). */
export async function deletePromo(_id: string): Promise<boolean> {
    const promo = await findPromo({ id: _id });
    if (!promo) throw new NotFoundError('Promo not found');
    if (promo.timesUsed > 0) {
        throw new ConflictError(
            `${promo.code} was used by ${promo.timesUsed} booking${promo.timesUsed === 1 ? '' : 's'}, ` +
                'so reports need it. Archive it instead.',
            'PROMO_IN_USE',
            { timesUsed: promo.timesUsed },
        );
    }
    await ScheduleOperations.deletePromo(_id);
    return true;
}
