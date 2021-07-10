// const Webpack = require('webpack');

module.exports = {
  context: `${__dirname}/app`,
  entry: './entry',
  mode: 'none',
  devtool: 'source-map',
  output: {
    path: `${__dirname}/public/javascripts`,
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
        // use: {
        // loader: 'babel-loader',
        // options: {
        // presets: [
        // [
        // '@babel/preset-env',
        //   {
        //     targets: 'defaults',
        //     useBuiltIns: 'usage',
        //     corejs: '3.15',
        //     // modules: 'cjs',
        //   },
        // ],
        // ],
        // },
        // },
      },
    ],
  },
  plugins: [
    // new Webpack.ProvidePlugin({
    //   jQuery: 'jquery',
    //   $: 'jquery',
    // }),
  ],
};
