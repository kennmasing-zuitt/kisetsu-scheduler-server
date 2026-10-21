import { env } from '../../../core/config/env.js';
import { consoleProvider } from './consoleProvider.js';
import { semaphoreProvider } from './semaphoreProvider.js';
import type { SmsProvider } from './smsProvider.js';

export * from './smsProvider.js';

let override: SmsProvider | null = null;

/** The provider picked by SMS_PROVIDER (tests can swap it with setSmsProviderForTests). */
export function smsProvider(): SmsProvider {
    if (override) return override;
    if (env.SMS_PROVIDER === 'semaphore') {
        if (!env.SEMAPHORE_API_KEY)
            throw new Error('SMS_PROVIDER=semaphore needs SEMAPHORE_API_KEY');
        return semaphoreProvider;
    }
    return consoleProvider;
}

export function setSmsProviderForTests(provider: SmsProvider | null): void {
    override = provider;
}
