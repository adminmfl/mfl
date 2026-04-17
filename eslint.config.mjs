import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import prettierConfig from 'eslint-config-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      'react/no-unescaped-entities': 'off',
    },
  },
  prettierConfig,
  // Prevent direct sonner toast imports to enforce wrapper usage
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    ignores: ['src/lib/toast.ts', 'src/components/ui/toast-manager.tsx', 'src/components/ui/sonner.tsx'],
    rules: {
      'no-restricted-imports': ['warn', {
        paths: [{
          name: 'sonner',
          importNames: ['toast'],
          message: 'Use @/lib/toast instead of importing toast directly from sonner.',
        }],
      }],
    },
  },
];
