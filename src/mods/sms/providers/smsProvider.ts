/** Sends one text. Throws on failure; the caller retries and records the result. */
export interface SmsProvider {
    readonly name: string;
    /**
     * `to` is E.164. When `code` is set, `message` contains the placeholder {code} where the
     * code goes (providers with an OTP route pass the code separately).
     */
    send(
        to: string,
        message: string,
        opts: { code?: string },
    ): Promise<{ messageId: string | null }>;
}

export class SmsSendError extends Error {
    constructor(
        message: string,
        /** false when retrying can't help (bad number, wrong API key) */
        public retryable = true,
    ) {
        super(message);
        this.name = 'SmsSendError';
    }
}
