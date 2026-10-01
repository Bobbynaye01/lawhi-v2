import { base } from '@lawhi/config/eslint';
import globals from 'globals';

export default [
  ...base,
  { ignores: ['src/generated/**', 'dist/**'] },
  {
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    rules: {
      // Nest resolves providers from emitted decorator metadata: injected
      // classes must stay value imports.
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    // Jest configuration and setup files are CommonJS.
    files: ['**/*.js'],
    languageOptions: { sourceType: 'commonjs' },
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
];
