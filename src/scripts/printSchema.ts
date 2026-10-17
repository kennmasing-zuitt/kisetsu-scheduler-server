// Prints the full GraphQL schema (SDL) to stdout or a file, for client codegen or review.
//   npm run schema:print                 -> stdout
//   npm run schema:print -- schema.graphql -> writes the file
import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { printSchema } from 'graphql';
import { buildSchema } from '../core/graphql/schema.js';

const sdl = printSchema(buildSchema());
const outFile = process.argv[2];

if (outFile) {
    writeFileSync(outFile, `${sdl}\n`);
    console.log(`Schema written to ${outFile}`);
} else {
    console.log(sdl);
}
