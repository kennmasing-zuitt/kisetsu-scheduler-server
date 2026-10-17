import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import n from 'eslint-plugin-n';
import prettier from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig(
    { ignores: ['dist', 'coverage'] },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: { n },
        rules: {
            'n/no-process-env': 'error',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    ignoreRestSiblings: true,
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
            'no-console': 'error',
        },
    },
    { files: ['src/core/config/env.ts'], rules: { 'n/no-process-env': 'off' } },
    { files: ['src/scripts/printSchema.ts'], rules: { 'no-console': 'off' } },
    prettier,
);
