import nextConfig from 'eslint-config-next';
import prettierConfig from 'eslint-config-prettier';

export default [
  ...nextConfig,
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
