import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import prettier from 'eslint-config-prettier'

export default [
  {
    // Build output, Yarn internals, and vendored skill code are not ours to lint.
    // vite.config.js.timestamp-*.mjs is vite's compiled config, written next to the
    // real one while the dev server runs. Linting it fails on `process`, so a lint
    // run during `yarn dev` reports an error in a file nobody wrote.
    ignores: [
      'dist',
      '.yarn',
      '.pnp.cjs',
      '.pnp.loader.mjs',
      '.agents',
      '.claude',
      'vite.config.js.timestamp-*.mjs',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Accessibility lint — catches missing alt text, aria misuse, etc.
      ...jsxA11y.flatConfigs.recommended.rules,
      // Mark JSX-referenced identifiers (e.g. `motion` in `<motion.div>`) as used.
      'react/jsx-uses-vars': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    // The Express server, test files, Vitest config, and build scripts all run
    // under Node + Vitest globals rather than in the browser.
    files: ['src/test/**/*.{js,jsx}', 'scripts/**/*.{js,mjs}', 'server/**/*.js', '*.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
  prettier,
]
