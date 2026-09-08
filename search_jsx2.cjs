const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');
let allInterpolations = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // simple regex to find JSX interpolations, skipping ones that look like attributes if possible
  // actually just finding >{...}< or something similar
  const regex = />\{([^}]+)\}</g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    allInterpolations.push(`${file}: {${match[1].trim()}}`);
  }
});
fs.writeFileSync('interpolations.txt', allInterpolations.join('\n'));
