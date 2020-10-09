module.exports = {
  env: {
    browser: true, // document や console にエラーが出ないようにする
    es6: true, // es6から使える let や const にエラーがでないようにする
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
};
