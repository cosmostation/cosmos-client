module.exports = {
  root: true,
  env: {
    browser: true,
  },
  extends: ['./eslint/typescript.js', './eslint/import.js', './eslint/prettier.js'],
  rules: {
    '@typescript-eslint/camelcase': 'off',
    camelcase: 'off',
  },
};
