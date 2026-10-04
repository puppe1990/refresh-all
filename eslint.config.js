import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    files: ['popup.js'],
    languageOptions: {
      globals: { ...globals.browser, chrome: 'readonly' },
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
];
