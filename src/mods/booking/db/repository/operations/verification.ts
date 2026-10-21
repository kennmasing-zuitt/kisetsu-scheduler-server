import type { MobileVerification } from '../../_booking.types.js';
import { MobileVerificationModel } from '../../mobileVerification.model.js';

/** Stores the code for this number, replacing any earlier one. */
export const saveVerification = async (
    mobile: string,
    codeHash: string,
    expiresAt: Date,
): Promise<void> => {
    await MobileVerificationModel.updateOne(
        { mobile },
        { $set: { codeHash, expiresAt, attempts: 0 } },
        { upsert: true },
    );
};

export const findVerification = async (mobile: string): Promise<MobileVerification | null> =>
    MobileVerificationModel.findOne({
        mobile,
        expiresAt: { $gt: new Date() },
    }).lean<MobileVerification>();

/** Counts a wrong try; returns the tries so far. */
export const recordVerificationAttempt = async (mobile: string): Promise<number> => {
    const doc = await MobileVerificationModel.findOneAndUpdate(
        { mobile },
        { $inc: { attempts: 1 } },
        { returnDocument: 'after' },
    ).lean<MobileVerification>();
    return doc?.attempts ?? 0;
};

export const deleteVerification = async (mobile: string): Promise<void> => {
    await MobileVerificationModel.deleteOne({ mobile });
};
