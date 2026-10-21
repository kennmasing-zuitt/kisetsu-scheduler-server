import type { ClientData, ClientDocument } from '../../_schedule.types.js';
import { ClientModel } from '../../client.model.js';

export const createClient = async (data: ClientData): Promise<ClientDocument> =>
    ClientModel.create(data);
