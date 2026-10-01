const fs = require('fs');
const path = require('path');

const rnDir = path.resolve(__dirname, '../node_modules/react-native');
const polyPath = path.join(rnDir, 'rn-get-polyfills.js');
const pkgPath = path.join(rnDir, 'package.json');

if (fs.existsSync(rnDir)) {
  if (!fs.existsSync(polyPath)) {
    fs.writeFileSync(polyPath, "module.exports = require('@react-native/js-polyfills');\n");
  }
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      if (pkg.exports && !pkg.exports['./rn-get-polyfills']) {
        pkg.exports['./rn-get-polyfills'] = './rn-get-polyfills.js';
        pkg.exports['./rn-get-polyfills.js'] = './rn-get-polyfills.js';
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
      }
    } catch (e) {
      console.warn('[patch-rn] Notice:', e.message);
    }
  }
}
