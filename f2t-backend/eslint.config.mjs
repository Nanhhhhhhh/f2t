// eslint.config.mjs
// F2T Backend — ESLint Flat Config
// Philosophy: strict on real bugs, pragmatic on NestJS/Mongoose patterns.
// Replace the existing eslint.config.mjs (or .eslintrc.js) with this file.

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(
  // ── Base ignores ────────────────────────────────────────────────────────────
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'src/seed/**',        // seed scripts use any intentionally — excluded
      'src/seed.ts',
      '**/*.js',            // compiled output
      '**/*.d.ts',
    ],
  },

  // ── Base JS recommended ──────────────────────────────────────────────────────
  eslint.configs.recommended,

  // ── TypeScript strict (type-checked) ────────────────────────────────────────
  // We use strict-type-checked as a base, then override the noisy rules below.
  ...tseslint.configs.strictTypeChecked,

  // ── Project-wide parser options ──────────────────────────────────────────────
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // ── Rule overrides — production source files ─────────────────────────────────
  {
    files: ['src/**/*.ts'],
    rules: {

      // ── KEEP STRICT — these catch real bugs ─────────────────────────────────

      // Unhandled promises crash the app silently
      '@typescript-eslint/no-floating-promises': 'error',

      // Returning a promise from a non-async function is almost always a bug
      '@typescript-eslint/no-misused-promises': 'error',

      // Forces explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'warn',

      // Prevents accidental equality bugs
      'eqeqeq': ['error', 'always'],

      // No unused variables — catches dead code
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',      // allow _param convention
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // ── DOWNGRADE — real but noisy in NestJS/Mongoose context ───────────────

      // Mongoose documents are loosely typed by nature.
      // Keep as warn so the agent sees it but isn't blocked.
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',

      // ObjectId.toString() is the correct pattern in Mongoose.
      // Use .toHexString() where possible, but don't block the build.
      '@typescript-eslint/no-base-to-string': 'warn',

      // NestJS decorators (Injectable, Controller, etc.) return void.
      // Class methods that just configure don't always return a value.
      '@typescript-eslint/no-extraneous-class': 'off',

      // NestJS uses constructor injection — empty constructors are normal.
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',

      // Mongoose schema definitions use Record<string, unknown> and Mixed types.
      // Banning all explicit 'any' is too aggressive for schema declarations.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Class fields in NestJS modules are often injected via DI and used
      // across methods — not always initialized in constructor.
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // NestJS life-cycle hooks (onModuleInit, etc.) may return void or Promise.
      '@typescript-eslint/require-await': 'warn',

      // Decorators like @IsEnum() use string unions — needs typeof checks.
      '@typescript-eslint/restrict-template-expressions': [
        'warn',
        {
          allowNumber: true,   // allow `${number}` in templates
          allowBoolean: true,
          allowNullish: false, // null/undefined in templates is still a bug
        },
      ],

      // In services, we sometimes spread DTOs into update objects.
      // Restrict to warn so it's visible but not blocking.


      // ── OFF — patterns that are idiomatic in NestJS ──────────────────────────

      // NestJS @Module imports/exports arrays use object literals constantly.
      '@typescript-eslint/no-extraneous-class': 'off',

      // Mongoose Schema.Types.Mixed, Types.ObjectId are imported as namespaces.
      '@typescript-eslint/no-namespace': 'off',

      // Abstract classes used by NestJS strategies (PassportStrategy).
      '@typescript-eslint/no-abstract-class': 'off',

      // Decorators on abstract methods are valid NestJS pattern.
      'no-abstract-class': 'off',

      // Allow require() for legacy CJS modules (bcrypt, multer typings, etc.)
      '@typescript-eslint/no-require-imports': 'warn',

      // Allow empty catch blocks in health checks and graceful shutdown.
      'no-empty': ['error', { allowEmptyCatch: false }],

      // ── FORMATTING — handled by Prettier, not ESLint ─────────────────────────
      // These rules conflict with Prettier and cause churn.
      'indent': 'off',
      'quotes': 'off',
      'semi': 'off',
      'comma-dangle': 'off',
      'max-len': 'off',
      '@typescript-eslint/indent': 'off',
      '@typescript-eslint/quotes': 'off',
      '@typescript-eslint/semi': 'off',
      '@typescript-eslint/comma-dangle': 'off',
    },
  },

  // ── Test files — more relaxed ────────────────────────────────────────────────
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', 'test/**/*.ts'],
    rules: {
      // Tests use jest.fn() which is typed as any
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',

      // Test files intentionally use floating promises (it('...', async () => {}))
      '@typescript-eslint/no-floating-promises': 'warn',

      // Supertest chaining doesn't always need await
      '@typescript-eslint/no-misused-promises': 'warn',

      // Test descriptions can be long
      'max-len': 'off',

      // Mock return values use explicit any
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
);
