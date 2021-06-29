module.exports = {
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2020,
  },
  extends: [
    'plugin:react/recommended',
    // Airbnbが提供する共有設定。広く使われている
    'airbnb',
    // 各プラグイン推奨共有設定
    'airbnb/hooks',
    'plugin:import/errors',
    'plugin:import/warnings',
    // 'plugin:import/typescript',
    // 'plugin:@typescript-eslint/eslint-recommended',
    // 'plugin:@typescript-eslint/recommended',
    // 'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:prettier/recommended',
  ],
  // parser: '@typescript-eslint/parser',
  // parserOptions: {
  //   ecmaFeatures: {
  //     jsx: true,
  //   },
  //   ecmaVersion: 2020,
  //   project: './tsconfig.eslint.json', // プロジェクトに対するコンパイル設定ファイルのパス
  //   sourceType: 'module',
  //   tsconfigRootDir: __dirname,
  // },
  // plugins: ['@typescript-eslint', 'import', 'jsx-a11y', 'react', 'react-hooks'],
  plugins: ['import', 'jsx-a11y', 'react', 'react-hooks'],
  root: true, // 親ディレクトリの設定ファイルを読み込まないように設定
  rules: {
    'no-use-before-define': 'off',
    // '@typescript-eslint/no-use-before-define': ['error'],
    // should be rewritten as `['error', { allowAsStatement: true }]` in ESLint 7 or later
    // SEE: https://github.com/typescript-eslint/typescript-eslint/issues/1184
    'no-void': ['error', { allowAsStatement: true }],
    // '@typescript-eslint/no-unused-vars': [
    //   'error',
    //   {
    //     vars: 'all',
    //     args: 'after-used',
    //     argsIgnorePattern: '_',
    //     ignoreRestSiblings: false,
    //     varsIgnorePattern: '_',
    //   },
    // ],
    'import/extensions': [
      'error',
      'ignorePackages',
      {
        js: 'always',
        jsx: 'always',
        // ts: 'never',
        // tsx: 'never',
        mjs: 'always',
      },
    ],
    'react/jsx-filename-extension': [
      'error',
      {
        extensions: ['.jsx', '.tsx'],
      },
    ],
    'react/prop-types': false,
  },
  overrides: [
    // {
    //   files: ['*.tsx'],
    //   rules: {
    //     'react/prop-types': 'off',
    //   },
    // },
  ],
  settings: {
    'import/resolver': {
      node: {
        paths: ['src'],
      },
    },
  },
};
