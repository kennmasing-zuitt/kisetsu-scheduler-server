// vitest.config.ts (project root)
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Load .env.test when it exists. In CI there's no file; the workflow sets the variables instead.
const testEnv = existsSync('.env.test') ? parseEnv(readFileSync('.env.test', 'utf8')) : {};

const require = createRequire(import.meta.url);

export default defineConfig({
    resolve: {
        alias: [
            // graphql ships both index.mjs and index.js. Vite would give our code the .mjs build
            // while type-graphql/Apollo (loaded by Node) get the .js build, and graphql refuses
            // to mix two copies ("Cannot use GraphQLScalarType from another module or realm").
            // Point everything at the same build, exactly as Node does at runtime.
            { find: /^graphql$/, replacement: require.resolve('graphql') },
        ],
    },
    test: {
        env: testEnv as Record<string, string>,
        include: ['src/**/*.test.ts'],
        setupFiles: ['src/tests/setup.ts'],
        // All test files share one database, so run them one at a time
        fileParallelism: false,
        testTimeout: 15_000,
    },
});
