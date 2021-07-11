module.exports = (api) => {
  api.cache.using(() => process.env.NODE_ENV);
  if (process.env.NODE_ENV === 'test') {
    return {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: {
              node: 'current',
            },
            useBuiltIns: 'usage',
            corejs: '3.15',
            modules: 'cjs',
          },
        ],
        '@babel/preset-react',
      ],
      plugins: [
        'babel-plugin-transform-import-meta',
        // [
        //   'search-and-replace',
        //   {
        //     rules: [
        //       {
        //         searchTemplateStrings: true,
        //         search: 'rootDir',
        //         replace: __dirname,
        //       },
        //     ],
        //   },
        // ],
      ],
    };
  } else {
    return {
      presets: [
        [
          '@babel/preset-env',
          {
            targets: 'defaults',
            useBuiltIns: 'usage',
            corejs: '3.15',
            // modules: 'cjs',
          },
        ],
        '@babel/preset-react',
      ],
      // plugins: [],
    };
  }
};
