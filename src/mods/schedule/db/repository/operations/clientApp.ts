import type { Client } from '../../_schedule.types.js';
import { ClientModel } from '../../client.model.js';

/** Loads the client's sealed app secrets. Never return the result to a caller outside the server. */
export const findClientWithApp = async (filter: {
    id?: string;
    mobile?: string;
}): Promise<Client | null> => {
    const query = filter.id
        ? ClientModel.findById(filter.id)
        : ClientModel.findOne({ mobile: filter.mobile });
    return query.select('+app.secret +app.pendingSecret').lean<Client>();
};

export const setClientAppPending = async (id: string, sealed: string): Promise<boolean> => {
    const res = await ClientModel.updateOne({ _id: id }, { $set: { 'app.pendingSecret': sealed } });
    return res.matchedCount > 0;
};

/** The pending secret becomes the secret (replacing any earlier app). */
export const enableClientApp = async (
    id: string,
    sealed: string,
    step: number,
): Promise<Client | null> =>
    ClientModel.findOneAndUpdate(
        { _id: id, 'app.pendingSecret': sealed },
        {
            $set: {
                'app.secret': sealed,
                'app.pendingSecret': null,
                'app.lastStep': step,
                'app.failedAttempts': 0,
                'app.lockedUntil': null,
                'app.enabledAt': new Date(),
            },
            // A new phone signs out sessions from the old one
            $inc: { 'app.version': 1 },
        },
        { returnDocument: 'after' },
    ).lean<Client>();

/** Records an accepted code; atomic, so the same code can't be used twice. */
export const acceptClientAppStep = async (id: string, step: number): Promise<boolean> => {
    const res = await ClientModel.updateOne(
        { _id: id, $or: [{ 'app.lastStep': null }, { 'app.lastStep': { $lt: step } }] },
        { $set: { 'app.lastStep': step, 'app.failedAttempts': 0, 'app.lockedUntil': null } },
    );
    return res.modifiedCount > 0;
};

/** Counts a wrong code; after `max` in a row, sign-in is locked until `lockUntil`. */
export const recordClientAppFailure = async (
    id: string,
    max: number,
    lockUntil: Date,
): Promise<void> => {
    const after = await ClientModel.findByIdAndUpdate(
        id,
        { $inc: { 'app.failedAttempts': 1 } },
        { returnDocument: 'after' },
    );
    if (after && (after.app?.failedAttempts ?? 0) >= max) {
        await ClientModel.updateOne(
            { _id: id },
            { $set: { 'app.failedAttempts': 0, 'app.lockedUntil': lockUntil } },
        );
    }
};

/** Staff reset (lost phone): app sign-in off, existing sessions end. */
export const clearClientApp = async (id: string): Promise<Client | null> =>
    ClientModel.findByIdAndUpdate(
        id,
        {
            $set: {
                'app.secret': null,
                'app.pendingSecret': null,
                'app.lastStep': null,
                'app.failedAttempts': 0,
                'app.lockedUntil': null,
                'app.enabledAt': null,
            },
            $inc: { 'app.version': 1 },
        },
        { returnDocument: 'after' },
    ).lean<Client>();
