import type { Service } from '../../_schedule.types.js';
import { ServiceModel } from '../../service.model.js';

/** Services sorted by name; archived ones only when asked for. */
export const readServices = async ({
    includeArchived = false,
}: { includeArchived?: boolean } = {}): Promise<Service[]> =>
    ServiceModel.find(includeArchived ? {} : { isActive: true })
        .collation({ locale: 'en', numericOrdering: true })
        .sort({ name: 1, _id: 1 })
        .lean<Service[]>();
