import type { Paginated } from '../../../../shared/pagination.js';
import type { ClientSearch, ClientWithStats } from '../../db/_schedule.types.js';
import * as ScheduleOperations from '../../db/repository/index.js';
import { withClientStats } from './withClientStats.js';

/** Search clients by name or mobile, with their visit counts. */
export const readClients = async (search: ClientSearch): Promise<Paginated<ClientWithStats>> => {
    const page = await ScheduleOperations.searchClients(search);
    return { ...page, data: await withClientStats(page.data) };
};
