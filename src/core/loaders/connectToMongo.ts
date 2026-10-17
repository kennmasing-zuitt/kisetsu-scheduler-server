import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { logger } from '../logger.js';

export async function connectDB(): Promise<void> {
    if (env.isDevelopment) {
        mongoose.set('debug', true);
    }
    mongoose.connection.on('connected', () => {
        const { host, port, name } = mongoose.connection;
        logger.info('MongoDB connected', { host, port, db: name });
    });

    mongoose.connection.on('error', (err: Error) => {
        logger.error('MongoDB error', { error: err.message, stack: err.stack });
    });

    mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
    });

    await mongoose.connect(env.MONGO_URI);
}

export async function disconnectDB(): Promise<void> {
    await mongoose.disconnect();
    logger.info('MongoDB connection closed');
}
