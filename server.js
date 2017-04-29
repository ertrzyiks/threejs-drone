const express = require('express')
const cons = require('consolidate')

const webpackMiddleware = require('webpack-dev-middleware')
const webpack = require('webpack')
const webpackConfig = require('./webpack.config.js')

const app = express()

const PORT = process.env.PORT || 3000

app.engine('nunjucks', cons.nunjucks)
app.set('view engine', 'nunjucks')
app.set('views', __dirname + '/src')

app.use(express.static('assets'))

app.use(webpackMiddleware(webpack(webpackConfig), {
  stats: {
    colors: true
  },
  serverSideRender: true
}))

app.get('/', (req, res) => {
  const assetsByChunkName = res.locals.webpackStats.toJson().assetsByChunkName

  res.render('index', {
    js_path: assetsByChunkName.main
  })
})

console.log('Starting server on localhost:' + PORT)
app.listen(PORT)
