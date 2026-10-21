import type { Client, UpdateClientData } from '../../_schedule.types.js';
import { ClientModel } from '../../client.model.js';

export const updateClient = async ({
    _id,
    ...fields
}: UpdateClientData): Promise<Client | null> => {
    const $set = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
    return ClientModel.findByIdAndUpdate(
        _id,
        { $set },
        { returnDocument: 'after', runValidators: true },
    ).lean<Client>();
};
