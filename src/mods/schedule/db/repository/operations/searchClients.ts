import type { Paginated } from '../../../../../shared/pagination.js';
import type { Client, ClientSearch } from '../../_schedule.types.js';
import { ClientModel } from '../../client.model.js';

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Clients by name or mobile, sorted by name. Every word must match the first or last name
 * ("juan dela" finds Juan Dela Cruz); 3+ digits also match the mobile, ignoring a leading 0 or
 * 63 ("0917 123" finds +63917123…).
 */
export const searchClients = async ({
    search,
    page,
    limit,
}: ClientSearch): Promise<Paginated<Client>> => {
    const conditions: object[] = [];
    if (search) {
        const words = search.split(/\s+/).filter(Boolean);
        conditions.push({
            $and: words.map((w) => {
                const rx = new RegExp(escape(w), 'i');
                return { $or: [{ firstName: rx }, { lastName: rx }] };
            }),
        });
        const digits = search.replace(/\D/g, '').replace(/^(?:63|0)/, '');
        if (digits.length >= 3) conditions.push({ mobile: new RegExp(escape(digits)) });
    }
    const filter = conditions.length ? { $or: conditions } : {};
    const [docs, total] = await Promise.all([
        ClientModel.find(filter)
            .collation({ locale: 'en', strength: 2 })
            .sort({ firstName: 1, lastName: 1, _id: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean<Client[]>(),
        ClientModel.countDocuments(filter),
    ]);
    return { data: docs, page, limit, total, totalPages: Math.ceil(total / limit) };
};
