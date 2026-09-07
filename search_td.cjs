const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');
let out = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const regex = /<td[^>]*>([^<]+)<\/td>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match[1].includes('{')) {
      out.push(`${file}: ${match[1].trim()}`);
    }
  }
});
fs.writeFileSync('tds.txt', out.join('\n'));
