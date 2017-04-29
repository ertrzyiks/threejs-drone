const path = require('path')

module.exports = {
  entry: './src/index.js',

  output: {
    path: path.resolve(__dirname, 'docs'),
    filename: '[name]-[chunkhash].js'
  },

  resolve: {
    alias: {
      'lib': path.join(__dirname, 'lib')
    }
  }
}