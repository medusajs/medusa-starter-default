// Patch @medusajs/promotion — bug: @mikro-orm/postgresql does not export `raw`,
// but @mikro-orm/core does. Fixed upstream, workaround until a stable release ships.
const fs = require('fs')
const path = require('path')

const file = path.join(
  __dirname,
  '../node_modules/@medusajs/promotion/dist/utils/compute-actions/build-promotion-rule-query-filter-from-context.js'
)

if (!fs.existsSync(file)) {
  console.log('[patch-promotion] File not found, skipping.')
  process.exit(0)
}

const content = fs.readFileSync(file, 'utf8')
const patched = content.replace(
  'require("@mikro-orm/postgresql")',
  'require("@mikro-orm/core")'
)

if (content === patched) {
  console.log('[patch-promotion] Already patched or pattern not found.')
} else {
  fs.writeFileSync(file, patched)
  console.log('[patch-promotion] Patched @medusajs/promotion successfully.')
}
