import type { ClientWithStats } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { withClientStats } from './withClientStats.js';

/** One client with visit counts, by id or by (canonical) mobile; null when not found. */
export async function findClient(
    by: { id: string } | { mobile: string },
): Promise<ClientWithStats | null> {
    const client =
        'id' in by
            ? await ScheduleOperations.findClientById(by.id)
            : await ScheduleOperations.findClientByMobile(by.mobile);
    if (!client) return null;
    const [withStats] = await withClientStats([client]);
    return withStats;
}
