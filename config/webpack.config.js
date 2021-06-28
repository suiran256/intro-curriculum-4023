const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');

const htmlWebpackPlugin = new HtmlWebPackPlugin({
  template: './src/index.html',
  filename: './index.html',
});

module.exports = {
  entry: { app: './src/index.jsx', ajax: './app/entry.js' },
  output: {
    path: path.resolve('dist'),
    filename: 'js/[name].bundle.[contenthash].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        // test: /\.(scss)$/,
        test: /\.(css)$/,

        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
          },
          // {
          //   loader: 'postcss-loader',
          //   options: {
          //     plugins: function () {
          //       return [require('precss'), require('autoprefixer')];
          //     },
          //   },
          // },
          // { loader: 'sass-loader' },
        ],
      },
    ],
  },
  plugins: [htmlWebpackPlugin],
};
