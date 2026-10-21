import 'reflect-metadata';
import { connectDB } from './core/loaders/connectToMongo.js';
import gracefulShutdown from './core/loaders/gracefulShutdown.js';
import startExpress from './core/loaders/startExpress.js';
import { RolesImpl } from './mods/roles/index.js';

await connectDB();
// The default `user` role and the locked `super-admin` role must always exist
await RolesImpl.ensureSystemRoles();
const { apollo, bookingApollo } = await startExpress();
gracefulShutdown(apollo, bookingApollo);
