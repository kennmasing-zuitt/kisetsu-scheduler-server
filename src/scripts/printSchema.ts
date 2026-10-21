// Prints the full GraphQL schema (SDL) to stdout or a file, for client codegen or review.
//   npm run schema:print                 -> stdout
//   npm run schema:print -- schema.graphql -> writes the file
//   npm run schema:print -- schema.graphql booking.schema.graphql
//                                          -> also writes the public booking API's schema
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { printSchema } from 'graphql';
import { buildBookingSchema, buildSchema } from '../core/graphql/schema.js';

const sdl = printSchema(buildSchema());
const outFile = process.argv[2];

if (outFile) {
    writeFileSync(outFile, `${sdl}\n`);
    console.log(`Schema written to ${outFile}`);
    const bookingFile = process.argv[3];
    if (bookingFile) {
        writeFileSync(bookingFile, `${printSchema(buildBookingSchema())}\n`);
        console.log(`Booking schema written to ${bookingFile}`);
    }
} else {
    console.log(sdl);
}
