import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-plugin-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'
import eslintConfigPrettier from 'eslint-config-prettier'

export default defineConfig([
  globalIgnores(['dist']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,

      // ⭐ Prettier랑 충돌 나는 ESLint 규칙 OFF
      eslintConfigPrettier,
    ],
    plugins: {
      prettier,
    },
    rules: {
      // ⭐ Prettier 결과를 ESLint 에러로
      'prettier/prettier': 'error',

      // ⭐ 세미콜론 안 쓰면 에러
      semi: ['error', 'always'],
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },
])
