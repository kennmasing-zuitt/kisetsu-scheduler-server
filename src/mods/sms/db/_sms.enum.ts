/** Why a text was sent. */
export enum SmsPurpose {
    /** 6-digit code proving the client owns the mobile number (app sign-in setup) */
    setupCode = 'setupCode',
    /** A booking was cancelled because the therapist became unavailable, or by staff */
    rebook = 'rebook',
}
export const SMS_PURPOSE_VALUES = Object.values(SmsPurpose) as SmsPurpose[];

export enum SmsStatus {
    sending = 'sending',
    sent = 'sent',
    failed = 'failed',
}
export const SMS_STATUS_VALUES = Object.values(SmsStatus) as SmsStatus[];
