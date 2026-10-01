import { base } from '@lawhi/config/eslint';
import globals from 'globals';

export default [
  ...base,
  { ignores: ['dist/**'] },
  { languageOptions: { globals: globals.browser } },
];
