import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import noInvisibleUnicode from './eslint-rules/no-invisible-unicode.mjs';

export default [
    {
        files: ['**/*.ts'],
    },
    {
        plugins: {
            '@typescript-eslint': typescriptEslint,
            otak: {
                rules: {
                    'no-invisible-unicode': noInvisibleUnicode,
                },
            },
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: 'module',
        },

        rules: {
            '@typescript-eslint/naming-convention': [
                'warn',
                {
                    selector: 'import',
                    format: ['camelCase', 'PascalCase'],
                },
            ],

            curly: 'warn',
            eqeqeq: 'warn',
            'no-throw-literal': 'warn',
            'otak/no-invisible-unicode': 'error',
            semi: 'warn',
        },
    },
    // Disable rules that conflict with Prettier.
    eslintConfigPrettier,
];
