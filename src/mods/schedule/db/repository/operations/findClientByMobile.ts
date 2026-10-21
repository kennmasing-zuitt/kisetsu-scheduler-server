import type { Client } from '../../_schedule.types.js';
import { ClientModel } from '../../client.model.js';

/** `mobile` must already be in canonical form (shared/mobile.ts) */
export const findClientByMobile = async (mobile: string): Promise<Client | null> =>
    ClientModel.findOne({ mobile }).lean<Client>();
