import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        ...globals.node,
        L: 'readonly',
        SS: 'readonly',
        Html5Qrcode: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
        },
      ],
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'prefer-const': 'warn',
      'eqeqeq': [
        'warn',
        'always',
        {
          null: 'ignore',
        },
      ],
      'curly': ['warn', 'multi-line'],
      'no-var': 'warn',
    },
  },
];
