const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');

const htmlWebpackPlugin = new HtmlWebPackPlugin({
  template: './src/html/index.html',
  filename: './index.html',
});

module.exports = {
  entry: './src/index.jsx',
  output: {
    path: path.join(__dirname, 'dist'),
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
  // resolve: {
  //   extensions: ['.js', '.jsx'],
  // },
  plugins: [htmlWebpackPlugin],
};
