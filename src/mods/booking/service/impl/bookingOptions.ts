import { NotFoundError, ValidationError } from '../../../../shared/errors/AppError.js';
import { weekdayOf } from '../../../../shared/time.js';
import { ScheduleImpl } from '../../../schedule/index.js';
import type { PublicService, PublicTherapist } from '../../db/_booking.types.js';

/** Fixed lengths offered online for services priced for "any length" (e.g. Aki). */
const ANY_LENGTH_OPTIONS = [60, 90, 120];

/** Active services with each length and its price on `date` (only what can be booked then). */
export async function servicesForDate(date: string): Promise<PublicService[]> {
    const services = await ScheduleImpl.readServices({ includeArchived: false });
    const day = { dateKey: date, weekday: weekdayOf(date) };
    return services
        .map((s) => {
            const lengths = ScheduleImpl.pricedDurationsOn(s.prices, day);
            const anyLength = s.prices.some(
                (rule) => rule.durationMin == null && ScheduleImpl.priceRuleAppliesOn(rule, day),
            );
            const durations = lengths.length ? lengths : anyLength ? ANY_LENGTH_OPTIONS : [];
            const options = durations.flatMap((durationMin) => {
                const rule = ScheduleImpl.findServicePrice(s.prices, { ...day, durationMin });
                return rule ? [{ durationMin, price: rule.amount }] : [];
            });
            return { id: String(s._id), name: s.name, options };
        })
        .filter((s) => s.options.length > 0);
}

/** The price of a service for a length on a date; errors when it isn't sold that way. */
export async function priceFor(serviceId: string, durationMin: number, date: string) {
    const service = await ScheduleImpl.findServiceById(serviceId);
    if (!service || !service.isActive) throw new NotFoundError('Service not found');
    const rule = ScheduleImpl.findServicePrice(service.prices, {
        dateKey: date,
        weekday: weekdayOf(date),
        durationMin,
    });
    if (!rule)
        throw new ValidationError(
            `${service.name} isn't available for ${durationMin} minutes on that day`,
        );
    return { service, price: rule.amount };
}

/** Therapists by first name only (no schedule details). */
export async function publicTherapists(): Promise<PublicTherapist[]> {
    const roster = await ScheduleImpl.readTherapists();
    return roster.map((t) => ({ id: String(t._id), name: t.name.split(' ')[0] }));
}
