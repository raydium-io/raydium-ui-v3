module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  env: {
    es6: true,
    browser: true,
    jest: true,
    node: true
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 0,
    'object-shorthand': ['error', 'always'],
    '@typescript-eslint/no-non-null-assertion': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/no-children-prop': 'off'
  }
}
