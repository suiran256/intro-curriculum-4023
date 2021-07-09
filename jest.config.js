module.exports = {
  roots: ['<rootDir>/test/'],
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
    '\\.mjs$': 'babel-jest',
  },
};
