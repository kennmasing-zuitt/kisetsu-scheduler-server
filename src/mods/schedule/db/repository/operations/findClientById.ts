import type { Client } from '../../_schedule.types.js';
import { ClientModel } from '../../client.model.js';

export const findClientById = async (_id: string): Promise<Client | null> =>
    ClientModel.findById(_id).lean<Client>();
