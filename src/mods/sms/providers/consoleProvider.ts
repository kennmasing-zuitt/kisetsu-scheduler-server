import { logger } from '../../../core/logger.js';
import type { SmsProvider } from './smsProvider.js';

/** Development: writes the text to the server log instead of sending it. */
export const consoleProvider: SmsProvider = {
    name: 'console',
    async send(to, message, { code }) {
        // Development only: the code is printed so you can type it in
        logger.info(`[sms] to ${to}: ${code ? message.replaceAll('{code}', code) : message}`);
        return { messageId: null };
    },
};
