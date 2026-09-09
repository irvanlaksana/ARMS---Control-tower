const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');
let out = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = />\s*\{([^}<>]+)\}\s*</g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const v = match[1].trim();
    if (v.match(/^[a-zA-Z_0-9]+$/)) { // single variable
       out.push(`${file}: {${v}}`);
    }
  }
});
fs.writeFileSync('single_vars.txt', out.join('\n'));
