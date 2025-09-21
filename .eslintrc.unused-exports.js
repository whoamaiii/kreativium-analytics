// Dedicated ESLint config to surface unused imports/exports without breaking builds
// Run with: npx eslint -c .eslintrc.unused-exports.js .

import baseConfig from './eslint.config.js';
import unusedImports from 'eslint-plugin-unused-imports';

export default [
  ...baseConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      // Remove unused imports
      'unused-imports/no-unused-imports': 'warn',
      // Prefer plugin rule for unused vars to auto-fix unused imports refs
      'unused-imports/no-unused-vars': ['warn', {
        vars: 'all',
        varsIgnorePattern: '^_',
        args: 'after-used',
        argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
      // Avoid duplicate noise from base
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
    ignores: [
      '**/*.stories.*',
      '**/*.story.*',
      '**/*.(test|spec).*',
      'tests/**',
      'scripts/**',
      'dist/**',
      'public/**',
      'coverage/**',
      'artifacts/**',
    ],
  },
];


