const path = require('path')
const fs = require('fs')
const nunjucks = require('nunjucks')
const stats = require('../stats.json')

const template = path.join(__dirname, '../src/index.nunjucks')

const output = nunjucks.render(template, {
  js_path: stats.assetsByChunkName.main
})

fs.writeFile(path.join(__dirname, '../docs/index.html'), output)
