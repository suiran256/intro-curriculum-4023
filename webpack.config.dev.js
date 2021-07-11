const { merge } = require('webpack-merge');
const path = require('path');
const webpackConfig = require('./webpack.config.common.js');

module.exports = merge(webpackConfig, {
  mode: 'development',
  devtool: 'source-map',
  // watch: true,
  // watchOptions: {
  //   ignored: ["/node_modules/**"], //正規表現で指定（node_modules を除外）
  // },
  devServer: {
    contentBase: path.join(__dirname, 'dist'),
    // contentBase: "./dist",
    watchContentBase: true,
    historyApiFallback: true,
    inline: true,
    open: true,
    host: 'localhost',
    port: 8080,
    publicPath: '/',
    clientLogLevel: 'warning',
    hot: true,
    proxy: {
      '/auth/*': {
        target: 'http://localhost:3000',
        secure: false,
        logLevel: 'debug',
      },
    },
  },
});
