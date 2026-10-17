import 'reflect-metadata';
import { connectDB } from './core/loaders/connectToMongo.js';
import gracefulShutdown from './core/loaders/gracefulShutdown.js';
import startExpress from './core/loaders/startExpress.js';

await connectDB();
const { apollo } = await startExpress();
gracefulShutdown(apollo);
